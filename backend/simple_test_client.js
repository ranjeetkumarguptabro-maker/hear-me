/**
 * Simple Test Client - Test the backend API directly
 * Run this in browser console or as a standalone test
 */

const API_URL = "http://localhost:8000";

// Test alphabet prediction
async function testAlphabet() {
  console.log("🧪 Testing Alphabet Prediction...");
  
  // Create dummy landmarks (63 values - all 0.5 as placeholder)
  const dummyLandmarks = new Array(63).fill(0.5);
  
  try {
    const response = await fetch(`${API_URL}/predict/alphabet`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dummyLandmarks),
    });
    
    const data = await response.json();
    console.log("✅ Alphabet Test Result:", data);
    return data;
  } catch (error) {
    console.error("❌ Alphabet Test Failed:", error);
    return null;
  }
}

// Test word prediction
async function testWord() {
  console.log("🧪 Testing Word Prediction...");
  
  // Create dummy landmarks (1890 values - 30 frames × 63)
  const dummyLandmarks = new Array(1890).fill(0.5);
  
  try {
    const response = await fetch(`${API_URL}/predict/word`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dummyLandmarks),
    });
    
    const data = await response.json();
    console.log("✅ Word Test Result:", data);
    return data;
  } catch (error) {
    console.error("❌ Word Test Failed:", error);
    return null;
  }
}

// Test API status
async function testStatus() {
  console.log("🧪 Testing API Status...");
  
  try {
    const response = await fetch(`${API_URL}/`);
    const data = await response.json();
    console.log("✅ API Status:", data);
    return data;
  } catch (error) {
    console.error("❌ API Status Failed:", error);
    return null;
  }
}

// Run all tests
async function runAllTests() {
  console.log("🚀 Starting API Tests...\n");
  
  await testStatus();
  console.log("");
  
  await testAlphabet();
  console.log("");
  
  await testWord();
  console.log("\n✅ All tests completed!");
}

// Export for use
if (typeof module !== "undefined" && module.exports) {
  module.exports = { testAlphabet, testWord, testStatus, runAllTests };
}

// Auto-run if in browser console
if (typeof window !== "undefined") {
  console.log("📋 Test functions available:");
  console.log("  testStatus() - Check API status");
  console.log("  testAlphabet() - Test alphabet prediction");
  console.log("  testWord() - Test word prediction");
  console.log("  runAllTests() - Run all tests");
  console.log("\n💡 Run: runAllTests()");
}







