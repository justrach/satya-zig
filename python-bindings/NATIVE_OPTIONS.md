# Native Compilation Options for dhi

## The Problem
ctypes FFI overhead: ~150ns per call × 3 calls per user = 450ns overhead
Actual validation: ~50ns in Zig
**Result**: 90% time wasted on FFI!

## Solutions Ranked by Speed

### 🥇 Option 1: Python C Extension (FASTEST - Recommended)

Build a proper CPython extension module instead of using ctypes.

**Speed**: 5-10M items/sec (same as msgspec)
**Overhead**: 0ns (native code)

#### Implementation:

Create `src/python_ext.c`:
```c
#define PY_SSIZE_T_CLEAN
#include <Python.h>

// Link against libsatya.dylib
extern int satya_validate_int(long value, long min, long max);
extern int satya_validate_string_length(const char* str, size_t min_len, size_t max_len);
extern int satya_validate_email(const char* str);

static PyObject* py_validate_int(PyObject* self, PyObject* args) {
    long value, min, max;
    if (!PyArg_ParseTuple(args, "lll", &value, &min, &max))
        return NULL;
    
    int result = satya_validate_int(value, min, max);
    return PyBool_FromLong(result);
}

static PyMethodDef DhiMethods[] = {
    {"validate_int", py_validate_int, METH_VARARGS, "Validate integer"},
    {NULL, NULL, 0, NULL}
};

static struct PyModuleDef dhimodule = {
    PyModuleDef_HEAD_INIT,
    "_dhi_native",
    "Native Zig validators",
    -1,
    DhiMethods
};

PyMODINIT_FUNC PyInit__dhi_native(void) {
    return PyModule_Create(&dhimodule);
}
```

**Build**:
```bash
gcc -shared -fPIC -I/usr/include/python3.11 \
    src/python_ext.c -L./zig-out/lib -lsatya \
    -o dhi/_dhi_native.so
```

**Expected**: 10x faster than current (6M+ items/sec)

---

### 🥈 Option 2: Batch Validation (GOOD - Easy Win)

Validate many items in one FFI call.

**Speed**: 2-5M items/sec
**Overhead**: ~150ns amortized over N items

#### Implementation:

Update `src/c_api.zig` (already done!):
```zig
export fn satya_validate_users_batch(
    ids: [*]const i64,
    names: [*]const [*:0]const u8,
    emails: [*]const [*:0]const u8,
    ages: [*]const i64,
    count: usize,
    results: [*]u8,
) usize { /* ... */ }
```

Python wrapper:
```python
def validate_batch(users: List[dict]) -> List[bool]:
    # Prepare arrays
    ids = (ctypes.c_int64 * len(users))(*[u['id'] for u in users])
    ages = (ctypes.c_int64 * len(users))(*[u['age'] for u in users])
    names = (ctypes.c_char_p * len(users))(*[u['name'].encode() for u in users])
    emails = (ctypes.c_char_p * len(users))(*[u['email'].encode() for u in users])
    results = (ctypes.c_uint8 * len(users))()
    
    # Single FFI call!
    _zig._lib.satya_validate_users_batch(ids, names, emails, ages, len(users), results)
    return [bool(r) for r in results]
```

**Expected**: 3-5x faster (2M+ items/sec)

---

### 🥉 Option 3: PyO3-style Zig Extension (COMPLEX)

Create a Zig module that directly uses Python C API (like PyO3 for Rust).

**Speed**: 5-10M items/sec
**Overhead**: ~10ns per call

This would require:
- Zig code that calls Python C API directly
- Manual reference counting
- Complex but possible

**Example structure**:
```zig
const py = @cImport({
    @cInclude("Python.h");
});

export fn PyInit_dhi_native() *py.PyObject {
    // Create Python module from Zig
}
```

---

### 🏃 Option 4: Numba/Cython (ALTERNATIVE)

Use Python JIT compilers instead of Zig:

**Numba** (JIT):
```python
from numba import njit

@njit
def validate_int(value, min_val, max_val):
    return min_val <= value <= max_val
```

**Cython** (AOT):
```cython
cpdef int validate_int(long value, long min_val, long max_val):
    return min_val <= value <= max_val
```

**Speed**: 2-5M items/sec
**Pros**: Pure Python ecosystem
**Cons**: Extra dependencies

---

### 🎯 Option 5: mypyc (INTERESTING)

Compile Python to C using mypyc (used by Pydantic v2):

```bash
pip install mypy
mypyc dhi/validator.py
```

**Speed**: 2-3x faster than pure Python
**Pros**: No code changes needed!
**Cons**: Limited type support

---

## Recommendation: Hybrid Approach

### Phase 1 (v0.1.0 - NOW) ✅
- Ship pure Python
- 600K items/sec is great!
- Zero dependencies

### Phase 2 (v0.2.0 - NEXT)
- Add batch validation API
- Use existing Zig batch functions
- 2-5M items/sec for bulk operations
- Still fallback to pure Python for single items

### Phase 3 (v1.0.0 - FUTURE)
- Build proper C extension
- 5-10M items/sec
- Compete with msgspec

## Quick Win: Batch API

Let me implement this now - it's easy and gives 3-5x speedup!

```python
# Current (slow)
for user in users:
    validate_user(user)  # 3 FFI calls each

# Batch (fast)  
results = validate_users_batch(users)  # 1 FFI call total!
```

Want me to implement the batch API now? It's a 30-minute task for 3-5x speedup! 🚀
