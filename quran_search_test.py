#!/usr/bin/env python3
"""
Comprehensive Quran Search Functionality Testing Script
Tests all aspects of the Quran search API endpoint as requested in the review
"""

import requests
import json
import sys
from datetime import datetime

# Use the production URL from frontend/.env
BASE_URL = "https://prayer-tracker-27.preview.emergentagent.com/api"

def test_quran_search_endpoint_exists():
    """Test if the Quran search API endpoint exists and responds"""
    print("🔍 Testing Quran Search Endpoint Existence...")
    try:
        # Test with a simple query to see if endpoint exists
        response = requests.get(f"{BASE_URL}/quran/search", params={"query": "test"})
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if "results" in data:
                print("   ✅ PASS: Quran search endpoint exists and responds correctly")
                return True
            else:
                print(f"   ❌ FAIL: Endpoint exists but response format incorrect: {data}")
                return False
        else:
            print(f"   ❌ FAIL: Endpoint returned status {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ ERROR: {str(e)}")
        return False

def test_arabic_search_allah():
    """Test Arabic search with 'الله' (Allah)"""
    print("\n🔍 Testing Arabic Search - الله (Allah)...")
    try:
        response = requests.get(f"{BASE_URL}/quran/search", params={"query": "الله"})
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            results = data.get("results", [])
            print(f"   Response: Found {len(results)} results for 'الله'")
            
            if len(results) > 0:
                # Check first result structure
                first_result = results[0]
                required_fields = ["surahNumber", "nameAr", "nameEn", "ayah", "textAr"]
                if all(field in first_result for field in required_fields):
                    print(f"   ✅ PASS: Arabic search for 'الله' returns {len(results)} results with correct structure")
                    print(f"   Sample result: Surah {first_result['surahNumber']} ({first_result['nameAr']}), Ayah {first_result['ayah']}")
                    print(f"   Arabic text: {first_result['textAr'][:100]}...")
                    return True
                else:
                    print(f"   ❌ FAIL: Missing required fields in result: {first_result}")
                    return False
            else:
                print("   ❌ FAIL: No results found for 'الله' - this should return many results")
                return False
        else:
            print(f"   ❌ FAIL: Expected status 200, got {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ ERROR: {str(e)}")
        return False

def test_arabic_search_bismillah():
    """Test Arabic search with 'بسم' (Bismillah)"""
    print("\n🔍 Testing Arabic Search - بسم (Bismillah)...")
    try:
        response = requests.get(f"{BASE_URL}/quran/search", params={"query": "بسم"})
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            results = data.get("results", [])
            print(f"   Response: Found {len(results)} results for 'بسم'")
            
            if len(results) > 0:
                # Look for Al-Fatiha (should contain Bismillah)
                al_fatiha_found = False
                for result in results:
                    if result.get("surahNumber") == 1 and "بسم" in result.get("textAr", ""):
                        al_fatiha_found = True
                        print(f"   Found in Al-Fatiha: {result.get('textAr')}")
                        break
                
                if al_fatiha_found:
                    print(f"   ✅ PASS: Arabic search for 'بسم' returns {len(results)} results including Al-Fatiha")
                    return True
                else:
                    print(f"   ❌ FAIL: 'بسم' search should include Al-Fatiha but doesn't")
                    return False
            else:
                print("   ❌ FAIL: No results found for 'بسم' - this should return results")
                return False
        else:
            print(f"   ❌ FAIL: Expected status 200, got {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ ERROR: {str(e)}")
        return False

def test_arabic_search_with_diacritics():
    """Test Arabic search with diacritical marks"""
    print("\n🔍 Testing Arabic Search with Diacritics - الْحَمْدُ...")
    try:
        response = requests.get(f"{BASE_URL}/quran/search", params={"query": "الْحَمْدُ"})
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            results = data.get("results", [])
            print(f"   Response: Found {len(results)} results for 'الْحَمْدُ'")
            
            if len(results) > 0:
                # Check if Al-Fatiha 1:2 is found
                al_fatiha_1_2_found = False
                for result in results:
                    if (result.get("surahNumber") == 1 and result.get("ayah") == 2 and 
                        "الْحَمْدُ" in result.get("textAr", "")):
                        al_fatiha_1_2_found = True
                        print(f"   Found Al-Fatiha 1:2: {result.get('textAr')}")
                        break
                
                if al_fatiha_1_2_found:
                    print(f"   ✅ PASS: Arabic search with diacritics returns {len(results)} results including Al-Fatiha 1:2")
                    return True
                else:
                    print(f"   ❌ FAIL: Search with diacritics should find Al-Fatiha 1:2")
                    return False
            else:
                print("   ❌ FAIL: No results found for 'الْحَمْدُ' with diacritics")
                return False
        else:
            print(f"   ❌ FAIL: Expected status 200, got {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ ERROR: {str(e)}")
        return False

def test_search_response_format():
    """Test that search results have proper format with verse text, sura names, and verse numbers"""
    print("\n🔍 Testing Search Response Format and Data Structure...")
    try:
        response = requests.get(f"{BASE_URL}/quran/search", params={"query": "الله"})
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            results = data.get("results", [])
            
            if len(results) > 0:
                # Test first few results for proper structure
                for i, result in enumerate(results[:3]):
                    print(f"   Testing result {i+1} structure...")
                    
                    # Check required fields
                    required_fields = ["surahNumber", "nameAr", "nameEn", "ayah", "textAr"]
                    missing_fields = [field for field in required_fields if field not in result]
                    
                    if missing_fields:
                        print(f"   ❌ FAIL: Missing fields in result {i+1}: {missing_fields}")
                        return False
                    
                    # Verify data types and content
                    if not isinstance(result["surahNumber"], int) or result["surahNumber"] < 1:
                        print(f"   ❌ FAIL: Invalid surahNumber in result {i+1}: {result['surahNumber']}")
                        return False
                    
                    if not isinstance(result["ayah"], int) or result["ayah"] < 1:
                        print(f"   ❌ FAIL: Invalid ayah number in result {i+1}: {result['ayah']}")
                        return False
                    
                    if not result["nameAr"] or not result["nameEn"]:
                        print(f"   ❌ FAIL: Empty sura names in result {i+1}")
                        return False
                    
                    if not result["textAr"] or "الله" not in result["textAr"]:
                        print(f"   ❌ FAIL: Invalid or missing Arabic text in result {i+1}")
                        return False
                    
                    print(f"   ✅ Result {i+1}: Surah {result['surahNumber']} ({result['nameAr']} / {result['nameEn']}), Ayah {result['ayah']}")
                
                print(f"   ✅ PASS: All tested results have proper format with verse text, sura names, and verse numbers")
                return True
            else:
                print("   ❌ FAIL: No results to test format")
                return False
        else:
            print(f"   ❌ FAIL: Expected status 200, got {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ ERROR: {str(e)}")
        return False

def test_search_parameters():
    """Test different search parameters including bilingual options"""
    print("\n🔍 Testing Different Search Parameters...")
    
    test_cases = [
        {
            "name": "Basic Arabic search",
            "params": {"query": "رب"},
            "expected_results": True
        },
        {
            "name": "Tafseer bilingual search",
            "params": {"query": "الله", "bilingual": "tafseer"},
            "expected_results": True,
            "check_tafseer": True
        },
        {
            "name": "English bilingual search",
            "params": {"query": "الله", "bilingual": "en"},
            "expected_results": True,
            "check_en": True
        },
        {
            "name": "Spanish bilingual search", 
            "params": {"query": "الله", "bilingual": "es"},
            "expected_results": True,
            "check_es": True
        },
        {
            "name": "Empty query",
            "params": {"query": ""},
            "expected_results": False
        },
        {
            "name": "Multi-word search",
            "params": {"query": "بسم الله"},
            "expected_results": True
        }
    ]
    
    all_passed = True
    
    for test_case in test_cases:
        print(f"   Testing: {test_case['name']}")
        try:
            response = requests.get(f"{BASE_URL}/quran/search", params=test_case["params"])
            
            if response.status_code == 200:
                data = response.json()
                results = data.get("results", [])
                
                if test_case["expected_results"]:
                    if len(results) > 0:
                        print(f"   ✅ PASS: {test_case['name']} returned {len(results)} results")
                        
                        # Check specific bilingual features
                        if test_case.get("check_tafseer"):
                            tafseer_found = any(result.get("tafseer") for result in results[:5])
                            if tafseer_found:
                                print("   ✅ PASS: Tafseer field found in results")
                            else:
                                print("   ❌ FAIL: Tafseer field not found in bilingual=tafseer search")
                                all_passed = False
                        
                        if test_case.get("check_en"):
                            en_found = any(result.get("en") for result in results[:5])
                            if en_found:
                                print("   ✅ PASS: English translation field found in results")
                            else:
                                print("   ⚠️  NOTE: English translation field not found (may not be available in dataset)")
                        
                        if test_case.get("check_es"):
                            es_found = any(result.get("es") for result in results[:5])
                            if es_found:
                                print("   ✅ PASS: Spanish translation field found in results")
                            else:
                                print("   ⚠️  NOTE: Spanish translation field not found (may not be available in dataset)")
                        
                    else:
                        print(f"   ❌ FAIL: {test_case['name']} expected results but got none")
                        all_passed = False
                else:
                    if len(results) == 0:
                        print(f"   ✅ PASS: {test_case['name']} correctly returned no results")
                    else:
                        print(f"   ❌ FAIL: {test_case['name']} expected no results but got {len(results)}")
                        all_passed = False
            else:
                print(f"   ❌ FAIL: {test_case['name']} returned status {response.status_code}")
                all_passed = False
                
        except Exception as e:
            print(f"   ❌ ERROR testing {test_case['name']}: {str(e)}")
            all_passed = False
    
    return all_passed

def test_database_connectivity():
    """Test database connectivity for Quran data by checking surahs endpoint"""
    print("\n🔍 Testing Database Connectivity for Quran Data...")
    try:
        response = requests.get(f"{BASE_URL}/quran/surahs")
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   Response: Found {len(data)} surahs in database")
            
            if len(data) > 0:
                # Check if Al-Fatiha is present
                al_fatiha_found = False
                for surah in data:
                    if surah.get("number") == 1 and "الفاتحة" in surah.get("nameAr", ""):
                        al_fatiha_found = True
                        print(f"   Found Al-Fatiha: {surah}")
                        break
                
                if al_fatiha_found:
                    print(f"   ✅ PASS: Database connectivity confirmed - {len(data)} surahs available including Al-Fatiha")
                    return True
                else:
                    print("   ❌ FAIL: Al-Fatiha not found in surahs list")
                    return False
            else:
                print("   ❌ FAIL: No surahs found in database")
                return False
        else:
            print(f"   ❌ FAIL: Expected status 200, got {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ ERROR: {str(e)}")
        return False

def test_search_performance():
    """Test search performance with different query lengths"""
    print("\n🔍 Testing Search Performance...")
    
    test_queries = [
        ("الله", "Single word"),
        ("بسم الله", "Two words"),
        ("بسم الله الرحمن", "Three words"),
        ("الحمد لله رب العالمين", "Long phrase")
    ]
    
    all_passed = True
    
    for query, description in test_queries:
        print(f"   Testing: {description} - '{query}'")
        try:
            start_time = datetime.now()
            response = requests.get(f"{BASE_URL}/quran/search", params={"query": query})
            end_time = datetime.now()
            
            response_time = (end_time - start_time).total_seconds()
            
            if response.status_code == 200:
                data = response.json()
                results = data.get("results", [])
                print(f"   ✅ PASS: {description} completed in {response_time:.2f}s, found {len(results)} results")
                
                if response_time > 5.0:
                    print(f"   ⚠️  WARNING: Response time {response_time:.2f}s is slow")
                
            else:
                print(f"   ❌ FAIL: {description} returned status {response.status_code}")
                all_passed = False
                
        except Exception as e:
            print(f"   ❌ ERROR testing {description}: {str(e)}")
            all_passed = False
    
    return all_passed

def test_edge_cases():
    """Test edge cases and error handling"""
    print("\n🔍 Testing Edge Cases and Error Handling...")
    
    edge_cases = [
        {
            "name": "Very long query",
            "query": "الله " * 50,  # Very long repeated query
            "should_work": True
        },
        {
            "name": "Special characters",
            "query": "الله@#$%",
            "should_work": True  # Should still find الله
        },
        {
            "name": "Numbers in query",
            "query": "الله123",
            "should_work": True  # Should still find الله
        },
        {
            "name": "Mixed Arabic and English",
            "query": "الله Allah",
            "should_work": True
        },
        {
            "name": "Only spaces",
            "query": "   ",
            "should_work": False
        },
        {
            "name": "Non-existent Arabic text",
            "query": "كلمةغيرموجودةفيالقرآن",
            "should_work": False  # Should return no results
        }
    ]
    
    all_passed = True
    
    for case in edge_cases:
        print(f"   Testing: {case['name']}")
        try:
            response = requests.get(f"{BASE_URL}/quran/search", params={"query": case["query"]})
            
            if response.status_code == 200:
                data = response.json()
                results = data.get("results", [])
                
                if case["should_work"]:
                    if len(results) > 0:
                        print(f"   ✅ PASS: {case['name']} returned {len(results)} results as expected")
                    else:
                        print(f"   ❌ FAIL: {case['name']} expected results but got none")
                        all_passed = False
                else:
                    if len(results) == 0:
                        print(f"   ✅ PASS: {case['name']} correctly returned no results")
                    else:
                        print(f"   ⚠️  NOTE: {case['name']} returned {len(results)} results (may be valid)")
            else:
                print(f"   ❌ FAIL: {case['name']} returned status {response.status_code}")
                all_passed = False
                
        except Exception as e:
            print(f"   ❌ ERROR testing {case['name']}: {str(e)}")
            all_passed = False
    
    return all_passed

def main():
    """Run all Quran search functionality tests"""
    print("=" * 80)
    print("🕌 COMPREHENSIVE QURAN SEARCH FUNCTIONALITY TESTING")
    print("=" * 80)
    print(f"Testing against: {BASE_URL}")
    print(f"Test started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Run all tests
    test_results = []
    
    test_results.append(("Endpoint Existence", test_quran_search_endpoint_exists()))
    test_results.append(("Database Connectivity", test_database_connectivity()))
    test_results.append(("Arabic Search - Allah", test_arabic_search_allah()))
    test_results.append(("Arabic Search - Bismillah", test_arabic_search_bismillah()))
    test_results.append(("Arabic Search with Diacritics", test_arabic_search_with_diacritics()))
    test_results.append(("Response Format", test_search_response_format()))
    test_results.append(("Search Parameters", test_search_parameters()))
    test_results.append(("Search Performance", test_search_performance()))
    test_results.append(("Edge Cases", test_edge_cases()))
    
    # Summary
    print("\n" + "=" * 80)
    print("📊 TEST SUMMARY")
    print("=" * 80)
    
    passed_tests = []
    failed_tests = []
    
    for test_name, result in test_results:
        if result:
            passed_tests.append(test_name)
            print(f"✅ PASS: {test_name}")
        else:
            failed_tests.append(test_name)
            print(f"❌ FAIL: {test_name}")
    
    print(f"\nTotal Tests: {len(test_results)}")
    print(f"Passed: {len(passed_tests)}")
    print(f"Failed: {len(failed_tests)}")
    
    if len(failed_tests) == 0:
        print("\n🎉 ALL QURAN SEARCH TESTS PASSED!")
        print("The Quran search functionality is working correctly.")
        return True
    else:
        print(f"\n⚠️  {len(failed_tests)} TEST(S) FAILED:")
        for test_name in failed_tests:
            print(f"   - {test_name}")
        print("\nThe Quran search functionality has issues that need to be addressed.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)