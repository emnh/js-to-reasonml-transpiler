# JavaScript to ReasonML Transpiler

Just started on this. Will be a helper script to port small examples from JS to
ReasonML. Don't expect too much. Should be mainly for generating a baseline for
externs, unless it grows to something bigger :p . Requires to actually run the
code because it will inspect the types for declaration at runtime.

I am using :
 - Esprima (reading js)
 - Escodegen (writing js)
