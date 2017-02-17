package carpa.js_to_ts_synthesis;

import java.util.Collection;
import java.util.HashSet;
import java.util.Set;

import org.apache.commons.collections4.SetValuedMap;
import org.apache.commons.collections4.multimap.HashSetValuedHashMap;

import carpa.js_to_ts_synthesis.ExecutionTracer.FunctionCall;

// Dummy class. Defines a type of null -> null for each function.
// Used for testing that the Typescript compiler is seeing the types correctly.

public class NullTypeDeducer extends TypeDeducer {
	protected FunctionTypeDefinition getTypeFor(String name, Collection<FunctionCall> calls) {
		
		SetValuedMap<Integer, Type> argTypes = new HashSetValuedHashMap<>();
		argTypes.put(0, Type.NULL);
		
		Set<Type> returnValueType = new HashSet<>();
		returnValueType.add(Type.NULL);
		
		return new FunctionTypeDefinition(name, argTypes, returnValueType);
	}
}
