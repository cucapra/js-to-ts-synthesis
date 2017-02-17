package carpa.js_to_ts_synthesis;

import java.util.Collection;
import java.util.HashSet;
import java.util.Map.Entry;
import java.util.Set;

import org.apache.commons.collections4.SetValuedMap;
import org.apache.commons.collections4.multimap.HashSetValuedHashMap;

import carpa.js_to_ts_synthesis.ExecutionTracer.FunctionCall;

public class SimpleTypeDeducer extends TypeDeducer {
	protected FunctionTypeDefinition getTypeFor(String name, Collection<FunctionCall> calls) {
		SetValuedMap<Integer, Type> argTypes = new HashSetValuedHashMap<>();
		Set<Type> returnValueType = new HashSet<>();
		
		for (FunctionCall call: calls){
			for (Entry<Integer, Object> arg: call.getArgs().entrySet()){
				argTypes.put(arg.getKey(), typeOf(arg.getValue()));
			}
			
			returnValueType.add(typeOf(call.getReturnValue()));
		}
		
		return new FunctionTypeDefinition(name, argTypes, returnValueType);
	}
	
	private Type typeOf(Object value){
		if (value instanceof String){
			return Type.STRING;
		}
		throw new IllegalArgumentException("Cannot convert " + value.getClass().getName());
	}
}
