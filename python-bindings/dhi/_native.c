/*
 * Native CPython extension for dhi
 * Links against libsatya.dylib (Zig backend)
 */

#define PY_SSIZE_T_CLEAN
#include <Python.h>

// External Zig functions from libsatya
extern int satya_validate_int(long value, long min, long max);
extern int satya_validate_string_length(const char* str, size_t min_len, size_t max_len);
extern int satya_validate_email(const char* str);
extern size_t satya_validate_users_batch(
    const long* ids,
    const char** names,
    const char** emails,
    const long* ages,
    size_t count,
    unsigned char* results
);

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

// Python wrapper: validate_users_batch(users_list) -> list[bool]
static PyObject* py_validate_users_batch(PyObject* self, PyObject* args) {
    PyObject* users_list;
    
    if (!PyArg_ParseTuple(args, "O!", &PyList_Type, &users_list)) {
        return NULL;
    }
    
    Py_ssize_t count = PyList_Size(users_list);
    if (count == 0) {
        return PyList_New(0);
    }
    
    // Allocate arrays
    long* ids = malloc(count * sizeof(long));
    const char** names = malloc(count * sizeof(char*));
    const char** emails = malloc(count * sizeof(char*));
    long* ages = malloc(count * sizeof(long));
    unsigned char* results = malloc(count * sizeof(unsigned char));
    
    if (!ids || !names || !emails || !ages || !results) {
        free(ids); free(names); free(emails); free(ages); free(results);
        return PyErr_NoMemory();
    }
    
    // Extract data from Python list
    for (Py_ssize_t i = 0; i < count; i++) {
        PyObject* user = PyList_GetItem(users_list, i);
        if (!PyDict_Check(user)) {
            free(ids); free(names); free(emails); free(ages); free(results);
            PyErr_SetString(PyExc_TypeError, "Expected list of dicts");
            return NULL;
        }
        
        PyObject* id_obj = PyDict_GetItemString(user, "id");
        PyObject* name_obj = PyDict_GetItemString(user, "name");
        PyObject* email_obj = PyDict_GetItemString(user, "email");
        PyObject* age_obj = PyDict_GetItemString(user, "age");
        
        ids[i] = PyLong_AsLong(id_obj);
        names[i] = PyUnicode_AsUTF8(name_obj);
        emails[i] = PyUnicode_AsUTF8(email_obj);
        ages[i] = PyLong_AsLong(age_obj);
    }
    
    // Call Zig batch validation (SINGLE FFI CALL!)
    satya_validate_users_batch(ids, names, emails, ages, count, results);
    
    // Convert results to Python list
    PyObject* result_list = PyList_New(count);
    for (Py_ssize_t i = 0; i < count; i++) {
        PyList_SetItem(result_list, i, PyBool_FromLong(results[i]));
    }
    
    // Cleanup
    free(ids); free(names); free(emails); free(ages); free(results);
    
    return result_list;
}

// Method definitions
static PyMethodDef DhiNativeMethods[] = {
    {"validate_int", py_validate_int, METH_VARARGS, 
     "Validate integer bounds (value, min, max) -> bool"},
    {"validate_string_length", py_validate_string_length, METH_VARARGS,
     "Validate string length (str, min_len, max_len) -> bool"},
    {"validate_email", py_validate_email, METH_VARARGS,
     "Validate email format (str) -> bool"},
    {"validate_users_batch", py_validate_users_batch, METH_VARARGS,
     "Batch validate users (list[dict]) -> list[bool]"},
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
