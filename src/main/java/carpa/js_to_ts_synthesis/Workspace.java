package carpa.js_to_ts_synthesis;

import java.io.File;
import java.io.IOException;
import java.io.PrintWriter;
import java.nio.charset.Charset;
import java.util.Collection;
import java.util.Map.Entry;
import java.util.logging.Logger;

import org.apache.commons.collections4.ListValuedMap;
import org.apache.commons.io.FileUtils;
import org.apache.commons.io.FilenameUtils;
import org.apache.commons.io.IOUtils;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.google.gson.JsonSyntaxException;

import carpa.js_to_ts_synthesis.TypeDeducer.FunctionTypeDefinition;
import lombok.Getter;
import lombok.Value;

public class Workspace {
	
	@Value
	private static class CompilerOptions
	{
		private boolean allowJs = true;
		private String outDir = "dist";
	}
	
	@Value
	private static class TsConfig
	{
		private CompilerOptions compilerOptions = new CompilerOptions();
		private String[] include = new String[]{"lib/*"};
	}
	
	private static final Logger LOGGER = Logger.getLogger(Workspace.class.getName());
	
	@Getter
	private final File directory;
	
	public Workspace(File directory, String repoUri){
		this.directory = directory;
		
		// Clone from the repo
		runCommand("git", "clone", repoUri, ".");
		
		// Install dependencies
		runCommand("npm", "install");
		
		// Install the tracer.
		runCommand("npm", "install", "njstrace");
	}
	
	public File getTestDirectory(){
		return new File(directory, "test");
	}
	
	public File getLibDirectory(){
		return new File(directory, "lib");
	}
	
	public void runTests(){
		runCommand("npm", "test");
	}
	
	public void exportTypeDefinitions(ListValuedMap<File, FunctionTypeDefinition> typeDefinitions) throws JsonSyntaxException, IOException {
		for (Entry<File, Collection<FunctionTypeDefinition>> entry: typeDefinitions.asMap().entrySet()){
			File definitionFile = new File(FilenameUtils.removeExtension(entry.getKey().getAbsolutePath())+ ".d.ts");
			LOGGER.info("Writing type definitions to " + definitionFile);
			
			try (PrintWriter writer = new PrintWriter(definitionFile)){
				for (FunctionTypeDefinition function: entry.getValue()){
					writer.println(Definitions.definitionFor(function));
				}
			}
		}
		
		Gson gson = new Gson();
		File packageFile = new File(directory, "package.json");
		JsonObject packageInfo = new JsonParser()
				.parse(FileUtils.readFileToString(packageFile, (Charset)null))
				.getAsJsonObject();
		
		File typingsFile = new File(getLibDirectory(), "index.d.ts");
		packageInfo.addProperty("typings", typingsFile.toString());
		
		LOGGER.info("Set typings to '" + typingsFile + "' in package.json");
		FileUtils.writeStringToFile(packageFile, gson.toJson(packageInfo), (Charset)null, false);
		
		File tsconfigFile = new File(directory, "tsconfig.json");
		FileUtils.writeStringToFile(tsconfigFile, gson.toJson(new TsConfig()), (Charset)null, false);
		
		runCommand("tsc");
	}
	
	private void runCommand(String... args) {
		try {
			LOGGER.info("Executing command [" + String.join(" ", args) + "]");
			Process process = new ProcessBuilder(args)
					.directory(directory)
					.redirectErrorStream(true)
					.start();
			int resultCode = process.waitFor();
			
			if (resultCode!=0){
				LOGGER.warning(IOUtils.toString(process.getInputStream(), (Charset)null));
				throw new RuntimeException("Command [" + String.join(" ", args) + "] failed with exit code " + resultCode);
			}
		}
		catch (InterruptedException|IOException e){
			throw new RuntimeException(e);
		}
		

	}
}
