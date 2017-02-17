package carpa.js_to_ts_synthesis;

import java.io.File;

import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;

import static org.assertj.core.api.Assertions.*;

public class PipelineTest {
	
	@Rule
	public TemporaryFolder tempFolder = new TemporaryFolder();

	@Test
	public void testSimpleModule() throws Exception {
		Pipeline pipeline = new Pipeline();
		pipeline.repoUri = "https://github.com/IonicaBizau/abs";
		pipeline.workingDir = tempFolder.newFolder();
		pipeline.run();
		
		assertThat(new File(new File(pipeline.workingDir, "lib"), "index.d.ts")).hasContent("declare function abs(arg0: string): string;");
		assertThat(contentOf(new File(new File(pipeline.workingDir, "dist"), "index.js"))).isNotEmpty();
	}
	
	@Test(expected=RuntimeException.class)
	public void testBadTypeDeducer() throws Exception {
		Pipeline pipeline = new Pipeline();
		pipeline.repoUri = "https://github.com/IonicaBizau/abs";
		pipeline.workingDir = tempFolder.newFolder();
		pipeline.typeDeducer = new NullTypeDeducer();
		pipeline.run();
	}
}
