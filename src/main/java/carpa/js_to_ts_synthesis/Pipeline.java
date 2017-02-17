package carpa.js_to_ts_synthesis;

import java.io.File;

import org.apache.commons.collections4.ListValuedMap;
import org.kohsuke.args4j.CmdLineException;
import org.kohsuke.args4j.CmdLineParser;
import org.kohsuke.args4j.Option;

import carpa.js_to_ts_synthesis.TypeDeducer.FunctionTypeDefinition;

public class Pipeline 
{
	@Option(name="-repo", required=true)
	/*package*/ String repoUri;
	
	@Option(name="-workingDir", required=true)
	/*package*/ File workingDir;
	
	/*package*/ TypeDeducer typeDeducer = new SimpleTypeDeducer();
	
	/*package*/ void run() throws Exception {
		Workspace workspace = new Workspace(workingDir, repoUri);
		ExecutionTracer tracer = new ExecutionTracer(workspace);
		
		ListValuedMap<File, FunctionTypeDefinition> types = typeDeducer.getAllTypeDefinitions(tracer.trace());
		workspace.exportTypeDefinitions(types);
	}
	
    public static void main(String[] args) throws Exception {
    	Pipeline pipeline = new Pipeline();
		CmdLineParser parser = new CmdLineParser(pipeline);
		try {
			parser.parseArgument(args);
		} catch (CmdLineException e) {
            System.err.println(e.getMessage());
            parser.printUsage(System.err);
            return;
		}
		
		pipeline.run();
    }
}
