/*
 * Native CPython extension for dhi
 * Links against libsatya.dylib (Zig backend)
 */

#define PY_SSIZE_T_CLEAN
#include <Python.h>

// External Zig functions from libsatya - COMPREHENSIVE VALIDATORS
// Basic validators
extern int satya_validate_int(long value, long min, long max);
extern int satya_validate_string_length(const char* str, size_t min_len, size_t max_len);
extern int satya_validate_email(const char* str);

// String validators (Zod-style)
extern int satya_validate_url(const char* str);
extern int satya_validate_uuid(const char* str);
extern int satya_validate_ipv4(const char* str);
extern int satya_validate_base64(const char* str);
extern int satya_validate_iso_date(const char* str);
extern int satya_validate_iso_datetime(const char* str);
extern int satya_validate_contains(const char* str, const char* substring);
extern int satya_validate_starts_with(const char* str, const char* prefix);
extern int satya_validate_ends_with(const char* str, const char* suffix);

// Number validators (Pydantic-style)
extern int satya_validate_int_gt(long value, long min);
extern int satya_validate_int_gte(long value, long min);
extern int satya_validate_int_lt(long value, long max);
extern int satya_validate_int_lte(long value, long max);
extern int satya_validate_int_positive(long value);
extern int satya_validate_int_non_negative(long value);
extern int satya_validate_int_negative(long value);
extern int satya_validate_int_non_positive(long value);
extern int satya_validate_int_multiple_of(long value, long divisor);

// Float validators
extern int satya_validate_float_gt(double value, double min);
extern int satya_validate_float_finite(double value);

// Python wrapper: validate_int(value, min, max) -> bool
static PyObject* py_validate_int(PyObject* self, PyObject* args) {
    long value, min, max;
    
    if (!PyArg_ParseTuple(args, "lll", &value, &min, &max)) {
        return NULL;
    }
    
    int result = satya_validate_int(value, min, max);
    return PyBool_FromLong(result);
}

// Python wrapper: validate_string_length(str, min_len, max_len) -> bool
static PyObject* py_validate_string_length(PyObject* self, PyObject* args) {
    const char* str;
    Py_ssize_t min_len, max_len;
    
    if (!PyArg_ParseTuple(args, "snn", &str, &min_len, &max_len)) {
        return NULL;
    }
    
    int result = satya_validate_string_length(str, (size_t)min_len, (size_t)max_len);
    return PyBool_FromLong(result);
}

// Python wrapper: validate_email(str) -> bool
static PyObject* py_validate_email(PyObject* self, PyObject* args) {
    const char* str;
    
    if (!PyArg_ParseTuple(args, "s", &str)) {
        return NULL;
    }
    
    int result = satya_validate_email(str);
    return PyBool_FromLong(result);
}

// Validator type enum for fast dispatch
enum ValidatorType {
    VAL_INT = 0,
    VAL_INT_GT,
    VAL_INT_GTE,
    VAL_INT_LT,
    VAL_INT_LTE,
    VAL_INT_POSITIVE,
    VAL_INT_NON_NEGATIVE,
    VAL_INT_MULTIPLE_OF,
    VAL_STRING,
    VAL_EMAIL,
    VAL_URL,
    VAL_UUID,
    VAL_IPV4,
    VAL_BASE64,
    VAL_ISO_DATE,
    VAL_ISO_DATETIME,
    VAL_UNKNOWN
};

// Convert string to enum (do this ONCE, not per item!)
static enum ValidatorType parse_validator_type(const char* type_str) {
    // Use first char for fast dispatch
    switch (type_str[0]) {
        case 'i':
            if (strcmp(type_str, "int") == 0) return VAL_INT;
            if (strcmp(type_str, "int_gt") == 0) return VAL_INT_GT;
            if (strcmp(type_str, "int_gte") == 0) return VAL_INT_GTE;
            if (strcmp(type_str, "int_lt") == 0) return VAL_INT_LT;
            if (strcmp(type_str, "int_lte") == 0) return VAL_INT_LTE;
            if (strcmp(type_str, "int_positive") == 0) return VAL_INT_POSITIVE;
            if (strcmp(type_str, "int_non_negative") == 0) return VAL_INT_NON_NEGATIVE;
            if (strcmp(type_str, "int_multiple_of") == 0) return VAL_INT_MULTIPLE_OF;
            if (strcmp(type_str, "ipv4") == 0) return VAL_IPV4;
            if (strcmp(type_str, "iso_date") == 0) return VAL_ISO_DATE;
            if (strcmp(type_str, "iso_datetime") == 0) return VAL_ISO_DATETIME;
            break;
        case 's':
            if (strcmp(type_str, "string") == 0) return VAL_STRING;
            break;
        case 'e':
            if (strcmp(type_str, "email") == 0) return VAL_EMAIL;
            break;
        case 'u':
            if (strcmp(type_str, "url") == 0) return VAL_URL;
            if (strcmp(type_str, "uuid") == 0) return VAL_UUID;
            break;
        case 'b':
            if (strcmp(type_str, "base64") == 0) return VAL_BASE64;
            break;
    }
    return VAL_UNKNOWN;
}

// Field spec with pre-parsed validator type AND cached PyObject
struct FieldSpec {
    PyObject* field_name_obj;  // Cached PyObject* for fast dict lookup
    const char* field_name;
    enum ValidatorType validator_type;
    long param1;
    long param2;
};

// OPTIMIZED: validate_batch_direct with enum dispatch
static PyObject* py_validate_batch_direct(PyObject* self, PyObject* args) {
    PyObject* items_list;
    PyObject* field_specs_dict;
    
    if (!PyArg_ParseTuple(args, "O!O!", 
                          &PyList_Type, &items_list,
                          &PyDict_Type, &field_specs_dict)) {
        return NULL;
    }
    
    Py_ssize_t count = PyList_Size(items_list);
    if (count == 0) {
        return Py_BuildValue("([]i)", 0);
    }
    
    // Pre-process field specs (convert strings to enums ONCE!)
    Py_ssize_t num_fields = PyDict_Size(field_specs_dict);
    struct FieldSpec* field_specs = malloc(num_fields * sizeof(struct FieldSpec));
    if (!field_specs) {
        return PyErr_NoMemory();
    }
    
    PyObject *field_name, *spec;
    Py_ssize_t pos = 0;
    Py_ssize_t field_idx = 0;
    
    while (PyDict_Next(field_specs_dict, &pos, &field_name, &spec)) {
        field_specs[field_idx].field_name_obj = field_name;  // Cache PyObject* (borrowed ref)
        field_specs[field_idx].field_name = PyUnicode_AsUTF8(field_name);
        
        if (PyTuple_Check(spec) && PyTuple_Size(spec) >= 1) {
            const char* type_str = PyUnicode_AsUTF8(PyTuple_GET_ITEM(spec, 0));
            field_specs[field_idx].validator_type = parse_validator_type(type_str);
            
            // Extract params (do this once, not per item!)
            field_specs[field_idx].param1 = 0;
            field_specs[field_idx].param2 = 0;
            if (PyTuple_Size(spec) >= 2) {
                field_specs[field_idx].param1 = PyLong_AsLong(PyTuple_GET_ITEM(spec, 1));
            }
            if (PyTuple_Size(spec) >= 3) {
                field_specs[field_idx].param2 = PyLong_AsLong(PyTuple_GET_ITEM(spec, 2));
            }
        } else {
            field_specs[field_idx].validator_type = VAL_UNKNOWN;
        }
        field_idx++;
    }
    
    // Allocate results array
    unsigned char* results = malloc(count * sizeof(unsigned char));
    if (!results) {
        free(field_specs);
        return PyErr_NoMemory();
    }
    
    // Initialize all as valid
    for (Py_ssize_t i = 0; i < count; i++) {
        results[i] = 1;
    }
    
    size_t valid_count = count;
    
    // Iterate through each item and validate all fields (OPTIMIZED with enum dispatch)
    for (Py_ssize_t i = 0; i < count; i++) {
        PyObject* item = PyList_GET_ITEM(items_list, i);  // Borrowed ref
        
        // Prefetch next item for better cache performance
        if (i + 1 < count) {
            __builtin_prefetch(PyList_GET_ITEM(items_list, i + 1), 0, 3);
        }
        
        // Fast dict check with branch prediction hint (usually true)
        if (__builtin_expect(!PyDict_Check(item), 0)) {
            free(field_specs);
            free(results);
            PyErr_SetString(PyExc_TypeError, "Expected list of dicts");
            return NULL;
        }
        
        // Iterate through pre-parsed field specs (ULTRA-FAST: use cached PyObject*)
        for (Py_ssize_t f = 0; f < num_fields; f++) {
            // Use PyDict_GetItem with cached PyObject* - FASTEST (borrowed ref, no refcount overhead)
            PyObject* field_value = PyDict_GetItem(item, field_specs[f].field_name_obj);
            
            if (!field_value) {
                // Missing field
                if (results[i] == 1) {
                    results[i] = 0;
                    valid_count--;
                }
                break;  // Missing field, skip remaining validations
            }
            
            // Fast dispatch using switch/case (NO string comparisons!)
            int is_valid = 1;
            
            switch (field_specs[f].validator_type) {
                case VAL_INT: {
                    long value = PyLong_AsLong(field_value);
                    is_valid = satya_validate_int(value, field_specs[f].param1, field_specs[f].param2);
                    break;
                }
                case VAL_INT_GT: {
                    long value = PyLong_AsLong(field_value);
                    is_valid = satya_validate_int_gt(value, field_specs[f].param1);
                    break;
                }
                case VAL_INT_GTE: {
                    long value = PyLong_AsLong(field_value);
                    is_valid = satya_validate_int_gte(value, field_specs[f].param1);
                    break;
                }
                case VAL_INT_LT: {
                    long value = PyLong_AsLong(field_value);
                    is_valid = satya_validate_int_lt(value, field_specs[f].param1);
                    break;
                }
                case VAL_INT_LTE: {
                    long value = PyLong_AsLong(field_value);
                    is_valid = satya_validate_int_lte(value, field_specs[f].param1);
                    break;
                }
                case VAL_INT_POSITIVE: {
                    long value = PyLong_AsLong(field_value);
                    is_valid = satya_validate_int_positive(value);
                    break;
                }
                case VAL_INT_NON_NEGATIVE: {
                    long value = PyLong_AsLong(field_value);
                    is_valid = satya_validate_int_non_negative(value);
                    break;
                }
                case VAL_INT_MULTIPLE_OF: {
                    long value = PyLong_AsLong(field_value);
                    is_valid = satya_validate_int_multiple_of(value, field_specs[f].param1);
                    break;
                }
                case VAL_STRING: {
                    const char* value = PyUnicode_AsUTF8(field_value);
                    is_valid = satya_validate_string_length(value, (size_t)field_specs[f].param1, (size_t)field_specs[f].param2);
                    break;
                }
                case VAL_EMAIL: {
                    const char* value = PyUnicode_AsUTF8(field_value);
                    is_valid = satya_validate_email(value);
                    break;
                }
                case VAL_URL: {
                    const char* value = PyUnicode_AsUTF8(field_value);
                    is_valid = satya_validate_url(value);
                    break;
                }
                case VAL_UUID: {
                    const char* value = PyUnicode_AsUTF8(field_value);
                    is_valid = satya_validate_uuid(value);
                    break;
                }
                case VAL_IPV4: {
                    const char* value = PyUnicode_AsUTF8(field_value);
                    is_valid = satya_validate_ipv4(value);
                    break;
                }
                case VAL_BASE64: {
                    const char* value = PyUnicode_AsUTF8(field_value);
                    is_valid = satya_validate_base64(value);
                    break;
                }
                case VAL_ISO_DATE: {
                    const char* value = PyUnicode_AsUTF8(field_value);
                    is_valid = satya_validate_iso_date(value);
                    break;
                }
                case VAL_ISO_DATETIME: {
                    const char* value = PyUnicode_AsUTF8(field_value);
                    is_valid = satya_validate_iso_datetime(value);
                    break;
                }
                case VAL_UNKNOWN:
                default:
                    is_valid = 1;  // Skip unknown validators
                    break;
            }
            
            // Update result if invalid (FAST: branch prediction - valid is common case)
            if (__builtin_expect(!is_valid, 0)) {  // Hint: validation usually succeeds
                if (results[i] == 1) {
                    results[i] = 0;
                    valid_count--;
                }
                break;  // Already invalid, skip remaining validations
            }
        }
    }
    
    // Convert results to Python list (FAST: use singleton bools, no allocations!)
    PyObject* result_list = PyList_New(count);
    for (Py_ssize_t i = 0; i < count; i++) {
        PyObject* bool_obj = results[i] ? Py_True : Py_False;
        Py_INCREF(bool_obj);  // Must incref singleton
        PyList_SET_ITEM(result_list, i, bool_obj);
    }
    
    // Cleanup
    free(field_specs);
    free(results);
    
    // Return (results, valid_count)
    return Py_BuildValue("(Ni)", result_list, (Py_ssize_t)valid_count);
}

// Method definitions
static PyMethodDef DhiNativeMethods[] = {
    {"validate_int", py_validate_int, METH_VARARGS, 
     "Validate integer bounds (value, min, max) -> bool"},
    {"validate_string_length", py_validate_string_length, METH_VARARGS,
     "Validate string length (str, min_len, max_len) -> bool"},
    {"validate_email", py_validate_email, METH_VARARGS,
     "Validate email format (str) -> bool"},
    {"validate_batch_direct", py_validate_batch_direct, METH_VARARGS,
     "GENERAL batch validation: (items, field_specs) -> (list[bool], int)"},
    {NULL, NULL, 0, NULL}
};

// Module definition
static struct PyModuleDef dhi_native_module = {
    PyModuleDef_HEAD_INIT,
    "_dhi_native",
    "Native Zig validators for dhi (CPython extension)",
    -1,
    DhiNativeMethods
};

// Module initialization
PyMODINIT_FUNC PyInit__dhi_native(void) {
    return PyModule_Create(&dhi_native_module);
}
