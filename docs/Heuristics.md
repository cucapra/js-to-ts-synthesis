# Heuristics

SimpleTypeDeducer applies the following list of heuristics to generalize types. See [Overview](Overview.md) for more info.

In the following list of heuristics, the symbol ∅ denotes a type component which has no values.

<!-- GitHub has trouble rendering these tables as MD. -->

**NullTypeComponent**
<table>
<thead>
<tr>
  <th>Rule</th>
  <th>Operation</th>
  <th>Rationale</th>
</tr>
</thead>
<tbody><tr>
  <td>INCLUDE-VALUE†</td>
  <td>∅ → null</td>
  <td>Even if no example included null, null may still be valid.</td>
</tr>
</tbody></table>

**UndefinedTypeComponent**
<table>
<thead>
<tr>
  <th>Rule</th>
  <th>Operation</th>
  <th>Rationale</th>
</tr>
</thead>
<tbody><tr>
  <td>INCLUDE-VALUE†</td>
  <td>∅ → undefined</td>
  <td>Even if no example included undefined, undefined may still be valid.</td>
</tr>
</tbody></table>

**BooleanTypeComponent**
<table>
<thead>
<tr>
  <th>Rule</th>
  <th>Operation</th>
  <th>Rationale</th>
</tr>
</thead>
<tbody><tr>
  <td>INCLUDE-VALUE†</td>
  <td>∅ → true</td>
  <td>Even if no example included a boolean value, true may still be valid.</td>
</tr>
<tr>
  <td>INCLUDE-VALUE</td>
  <td>false → boolean</td>
  <td>If no example included true, but some included false, true may be a valid value.</td>
</tr>
<tr>
  <td>INCLUDE-VALUE†</td>
  <td>∅ → false</td>
  <td>Even if no example included a boolean value, false may still be valid.</td>
</tr>
<tr>
  <td>INCLUDE-VALUE</td>
  <td>true → boolean</td>
  <td>If no example included false, but some included true, false may be a valid value.</td>
</tr>
</tbody></table>

**NumberTypeComponent**
<table>
<thead>
<tr>
  <th>Rule</th>
  <th>Operation</th>
  <th>Rationale</th>
</tr>
</thead>
<tbody><tr>
  <td>ROUND-TO-TOP†</td>
  <td>∅ → number</td>
  <td>Even if no example included a number, a number may still be valid.</td>
</tr>
<tr>
  <td>ROUND-TO-TOP</td>
  <td>n<sub>1</sub>,…,n<sub>k</sub> → number</td>
  <td>If an example included some number values, any number may be valid. In this case, the Validator will try several random numbers that were never seen to justify its hypothesis of any number being allowed.</td>
</tr>
</tbody></table>

**StringTypeComponent**
<table>
<thead>
<tr>
  <th>Rule</th>
  <th>Operation</th>
  <th>Rationale</th>
</tr>
</thead>
<tbody><tr>
  <td>ROUND-TO-TOP†</td>
  <td>∅ → string</td>
  <td>Even if no example included a string, a string may still be valid.</td>
</tr>
<tr>
  <td>ROUND-TO-TOP</td>
  <td>s<sub>1</sub>,…,s<sub>k</sub> → string</td>
  <td>If an example included some string values, any string may be valid. In this case, the Validator will try several random string that were never seen to justify its hypothesis of any string being allowed.</td>
</tr>
</tbody></table>

**FunctionTypeComponent** (Currently incomplete, as the tool does not yet handle the deduction of types for function parameters / return values)
<table>
<thead>
<tr>
  <th>Rule</th>
  <th>Operation</th>
  <th>Rationale</th>
</tr>
</thead>
<tbody><tr>
  <td>INCLUDE-VALUE†</td>
  <td>∅ → Function</td>
  <td>Even if no example included a function, a function may still be valid.</td>
</tr>
</tbody></table>

**ArrayOrTupleTypeComponent**
<table>
<thead>
<tr>
  <th>Rule</th>
  <th>Operation</th>
  <th>Rationale</th>
</tr>
</thead>
<tbody><tr>
  <td>RECURSIVE-TUPLE(*)</td>
  <td>t<sub>i</sub> → t<sub>i</sub>’ ⟹ [t<sub>1</sub>,…,t<sub>i</sub>,…,t<sub>k</sub>] → [t<sub>1</sub>,…,t<sub>i</sub>‘,…,t<sub>k</sub>]</td>
  <td>If some element in the tuple can be generalized and is still valid, the entire tuple can be generalized by replacing the type at the i-th position.</td>
</tr>
<tr>
  <td>TUPLE-COMBINE</td>
  <td>[t<sup>1</sup><sub>1</sub>,…,t<sup>1</sup><sub>m</sub>] | [t<sup>2</sup><sub>1</sub>,…,t<sup>2</sup><sub>n</sub>] → [t<sup>1</sup><sub>1</sub>+t<sup>2</sup><sub>1</sub>,…,t<sup>1</sup><sub>m</sub>+t<sup>2</sup><sub>m</sub>,t<sup>2</sup><sub>m+1</sub>,…,t<sup>2</sup><sub>n</sub>], m≤n</td>
  <td>If two tuples are both valid, combining them into one tuple makes the type more general, and may also be valid. For example, [number, number]|[string,string] may be generalized to [number|string, number|string], allowing values like [“a”, 1] and [1, “a”]. Here, t+t’ denotes the lowest upper bound of t and t’.</td>
</tr>
<tr>
  <td>FIELD-REMOVE</td>
  <td>[t<sub>i</sub>,…,t<sub>n</sub>] → [t<sub>i</sub>,…,t<sub>n-1</sub>]</td>
  <td>If some tuple is accepted, the last value of that tuple may not be needed, and can be excluded if the function still accepts the tuple without the last element.</td>
</tr>
</tbody></table>

**ObjectTypeComponent**
<table>
<thead>
<tr>
  <th>Rule</th>
  <th>Operation</th>
  <th>Rationale</th>
</tr>
</thead>
<tbody><tr>
  <td>RECURSIVE-TUPLE(*)</td>
  <td>t<sub>i</sub> → t<sub>i</sub>’ ⟹ {f<sub>1</sub>: t<sub>1</sub>,…,f<sub>i</sub>: t<sub>i</sub>,…,f<sub>n</sub>: t<sub>n</sub>} → {f<sub>1</sub>: t<sub>1</sub>,…,f<sub>i</sub>: t<sub>i</sub>‘,…,f<sub>n</sub>: t<sub>n</sub>}</td>
  <td>If some element in the object can be generalized and is still valid, the entire object can be generalized by replacing the type at that field.</td>
</tr>
<tr>
  <td>TUPLE-COMBINE</td>
  <td>{f<sub>1</sub>: t<sup>1</sup><sub>1</sub>,…,f<sub>m</sub>: t<sup>1</sup><sub>m</sub>} | {f<sub>1</sub>: t<sup>2</sup><sub>1</sub>,…,f<sub>n</sub>: t<sup>2</sup><sub>n</sub>} → {f<sub>1</sub>: t<sup>1</sup><sub>1</sub>+t<sup>2</sup><sub>1</sub>,…,f<sub>m</sub>: t<sup>1</sup><sub>m</sub>+t<sup>2</sup><sub>m</sub>,f<sub>m+1</sub>: t<sup>2</sup><sub>m+1</sub>,…,f<sub>n</sub>: t<sup>2</sup><sub>n</sub>}, m≤n</td>
  <td>If two objects are both valid, combining them into one makes the type more general, and may also be valid. For example, {x: number, y: number}|{x: string, y: string} may be generalized to {x: number|string, y: number|string}. Here, t+t’ denotes the lowest upper bound of t and t’.</td>
</tr>
<tr>
  <td>FIELD-REMOVE</td>
  <td>{f<sub>1</sub>: t<sub>1</sub>, f<sub>n</sub>: t<sub>n</sub>} → {f<sub>1</sub>: t<sub>1</sub>, f<sub>n-1</sub>: t<sub>n-1</sub>}</td>
  <td>If some object is accepted,some field of that object may not be needed, and can be excluded if the function still accepts the object. (Since f<sub>1</sub>,…,f<sub>n</sub> are arbitrarily ordered, this rule can remove any field).</td>
</tr>
</tbody></table>

† This rule will only be applied when the --roundUpArgsFromBottom flag is provided on the command line. By default, this flag is set to false and the TypeDeducer won't try to introduce new type components. For example, if no test cases ever had a string for some parameter, it wouldn't try to introduce a string. Setting this to try makes the TypeDeducer more complete, but less controlled.