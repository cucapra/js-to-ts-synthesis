package carpa.js_to_ts_synthesis;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.nio.charset.Charset;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Stack;

import org.apache.commons.collections4.ListValuedMap;
import org.apache.commons.collections4.multimap.ArrayListValuedHashMap;
import org.apache.commons.io.FileUtils;

import com.google.gson.Gson;

import lombok.Value;

public class ExecutionTracer {
	
	private static List<String> FUNCTIONS_TO_IGNORE = Arrays.asList("[Anonymous]");
	
	@Value
	private static class FunctionEntry {
		private String name;
		private String file;
		private Map<Integer, Object> args;
	}
	
	@Value
	private static class FunctionExit {
		private String name;
		private String file;
		// private boolean exception; (Might be useful later)
		private Object returnValue;
	}
	
	@Value
	private static class InstrumentationLine {
		// Exactly one of these will be set.
		private FunctionEntry entry;
		private FunctionExit exit;
	}
	
	private static class UnbalancedEntryExitException extends Exception {
		private static final long serialVersionUID = 1L;

		public UnbalancedEntryExitException(FunctionEntry entry, FunctionExit exit){
			super("Entered " + entry + " but exited " + exit);
		}
	}
	
	@Value
	public static class Function {
		String name;
		String file;
	}
	
	@Value
	public static class FunctionCall {
		private Map<Integer, Object> args;
		private Object returnValue;
	}
	
	private final Workspace workspace;
	
	public ExecutionTracer(Workspace workspace){
		this.workspace = workspace;
	}
	
	public ListValuedMap<Function, FunctionCall> trace() throws IOException, UnbalancedEntryExitException {
		File instrumentationOutput = new File(workspace.getDirectory(), "intrumentation_output.txt");
		
		// Add some code to trace function inputs and outputs, using https://www.npmjs.com/package/njstrace
		// This extra logic to prepended to each test file.
		
		for (File testFile: workspace.getTestDirectory().listFiles()){
			List<String> source = FileUtils.readLines(testFile, (Charset)null);
			
			FileUtils.writeLines(testFile, Arrays.asList(
					"var Formatter = require('njstrace/lib/formatter.js');",
					"var fs = require('fs');",
					"var out = fs.createWriteStream('" + instrumentationOutput.getAbsolutePath() + "', {'flags': 'a'});",
					"function MyFormatter() {}",
					"require('util').inherits(MyFormatter, Formatter);",
					"MyFormatter.prototype.onEntry = function(args) {out.write(JSON.stringify({'entry': args}) + '\\n');};",
					"MyFormatter.prototype.onExit = function(args) {out.write(JSON.stringify({'exit': args}) + '\\n')};",
					"var njstrace = require('njstrace').inject({ formatter: new MyFormatter() });"
					), false);
			
			FileUtils.writeLines(testFile, source, true);
		}
		
		workspace.runTests();
		
		return readInstrumentationOutput(instrumentationOutput);
	}
	
	private static ListValuedMap<Function, FunctionCall> readInstrumentationOutput(File instrumentationOutput) throws IOException, UnbalancedEntryExitException {
		try (BufferedReader reader = new BufferedReader(new FileReader(instrumentationOutput))){
			
			Gson gson = new Gson();
			Stack<FunctionEntry> callStack = new Stack<>();
			ListValuedMap<Function, FunctionCall> calls = new ArrayListValuedHashMap<>();
			
			String line;
			while ((line = reader.readLine())!=null){
				InstrumentationLine lineObj = gson.fromJson(line, InstrumentationLine.class);
				
				if (lineObj.getEntry()!=null){
					callStack.push(lineObj.getEntry());
				}
				else{
					FunctionExit exit = lineObj.getExit();
					FunctionEntry entry = callStack.pop();
					
					if (!entry.getName().equals(exit.getName())
							|| !entry.getFile().equals(exit.getFile()))
						throw new UnbalancedEntryExitException(entry, exit);
					
					if (!FUNCTIONS_TO_IGNORE.contains(entry.getName())){
						calls.put(new Function(entry.getName(), entry.getFile()), new FunctionCall(entry.getArgs(), exit.getReturnValue()));
					}
				}
			}
			
			return calls;
		}
	}
}
