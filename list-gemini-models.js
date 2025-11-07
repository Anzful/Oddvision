#!/usr/bin/env node

/**
 * List available Gemini models
 * Usage: node list-gemini-models.js YOUR_API_KEY
 */

const apiKey = process.argv[2] || process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error('❌ Error: No API key provided');
  console.error('\nUsage:');
  console.error('  node list-gemini-models.js YOUR_API_KEY');
  process.exit(1);
}

console.log('🔍 Listing available Gemini models...\n');
console.log('API Key:', apiKey.substring(0, 10) + '...');

async function listModels() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', response.status, response.statusText);
      console.error('Response:', errorText);
      process.exit(1);
    }
    
    const data = await response.json();
    
    if (!data.models || data.models.length === 0) {
      console.log('⚠️  No models found for this API key.');
      return;
    }
    
    console.log(`✅ Found ${data.models.length} models:\n`);
    console.log('─'.repeat(80));
    
    // Filter models that support generateContent
    const generateContentModels = data.models.filter(model => 
      model.supportedGenerationMethods?.includes('generateContent')
    );
    
    if (generateContentModels.length === 0) {
      console.log('⚠️  No models support generateContent');
      return;
    }
    
    console.log(`\n🎯 Models supporting generateContent (${generateContentModels.length}):\n`);
    
    generateContentModels.forEach((model, index) => {
      console.log(`${index + 1}. ${model.name}`);
      console.log(`   Display Name: ${model.displayName || 'N/A'}`);
      console.log(`   Description: ${model.description || 'N/A'}`);
      console.log(`   Supported Methods: ${model.supportedGenerationMethods?.join(', ') || 'N/A'}`);
      console.log('');
    });
    
    // Recommend which one to use
    const recommended = generateContentModels.find(m => 
      m.name.includes('flash') || m.name.includes('2.5')
    ) || generateContentModels[0];
    
    console.log('─'.repeat(80));
    console.log('\n💡 Recommended model for your extension:');
    console.log(`   ${recommended.name}`);
    console.log('\n📝 Update your background.js with:');
    console.log(`   const url = \`https://generativelanguage.googleapis.com/v1beta/${recommended.name}:generateContent?key=\${apiKey}\`;`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

listModels();
