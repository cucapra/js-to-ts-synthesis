package carpa.js_to_ts_synthesis;

import java.io.File;
import java.util.Collection;
import java.util.Map.Entry;
import java.util.Set;

import org.apache.commons.collections4.ListValuedMap;
import org.apache.commons.collections4.SetValuedMap;
import org.apache.commons.collections4.multimap.ArrayListValuedHashMap;

import carpa.js_to_ts_synthesis.ExecutionTracer.Function;
import carpa.js_to_ts_synthesis.ExecutionTracer.FunctionCall;
import lombok.Value;

public abstract class TypeDeducer {
	
	@Value
	public static class FunctionTypeDefinition {
		private String name;
		private SetValuedMap<Integer, Type> argTypes;
		private Set<Type> returnValueType;
	}
	
	public ListValuedMap<File, FunctionTypeDefinition> getAllTypeDefinitions(ListValuedMap<Function, FunctionCall> executions){
		ListValuedMap<File, FunctionTypeDefinition> result = new ArrayListValuedHashMap<>();
		
		for (Entry<Function, Collection<FunctionCall>> execution: executions.asMap().entrySet()){
			result.put(new File(execution.getKey().getFile()), getTypeFor(execution.getKey().getName(), execution.getValue()));
		}
		
		return result;
	}
	
	protected abstract FunctionTypeDefinition getTypeFor(String name, Collection<FunctionCall> calls);
}
