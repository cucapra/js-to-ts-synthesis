package carpa.js_to_ts_synthesis;

import java.util.StringJoiner;
import java.util.Collection;
import java.util.Map.Entry;

import carpa.js_to_ts_synthesis.TypeDeducer.FunctionTypeDefinition;

public class Definitions {
	
	public static String definitionFor(FunctionTypeDefinition function){
		StringJoiner argumentsJoiner = new StringJoiner(", ");
		for (Entry<Integer, Collection<Type>> arg: function.getArgTypes().asMap().entrySet()){
			StringJoiner typesJoiner = new StringJoiner("|");
			for (Type type : arg.getValue()){
				typesJoiner.add(type.toString().toLowerCase());
			}
			argumentsJoiner.add("arg" + arg.getKey() + ": " + typesJoiner.toString());
		}
		
		StringJoiner returnTypesJoiner = new StringJoiner("|");
		for (Type type: function.getReturnValueType()){
			returnTypesJoiner.add(type.toString().toLowerCase());
		}
		
		return "declare function " + function.getName() + "(" + argumentsJoiner.toString() + "): " + returnTypesJoiner.toString() + ";";
	}
}
