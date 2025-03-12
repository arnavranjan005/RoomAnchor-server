class MyClassificationPipeline {
    static task = 'feature-extraction';
    static model = 'Xenova/all-MiniLM-L6-v2';
    static instance = null;
  
    static async getInstance(progress_callback = null) {
      if (this.instance === null) {
        // Dynamically import the Transformers.js library
        let { pipeline, env } = await import('@xenova/transformers');
  
        // NOTE: Uncomment this to change the cache directory
        // env.cacheDir = './.cache';
  
        this.instance = pipeline(this.task, this.model, { progress_callback });
      }
  
      return this.instance;
    }
  }
  
  // Comment out this line if you don't want to start loading the model as soon as the server starts.
  // If commented out, the model will be loaded when the first request is received (i.e,. lazily).
  MyClassificationPipeline.getInstance();

module.exports = {MyClassificationPipeline};