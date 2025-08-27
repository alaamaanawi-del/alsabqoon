#!/usr/bin/env python3
"""
Backend API Testing Script for ALSABQON Prayer Tracker & Qur'an Study App
Tests all backend endpoints through the ingress path /api
Updated for comprehensive testing after mobile fixes
"""

import requests
import json
import sys
from datetime import datetime

# Use the production URL from frontend/.env
BASE_URL = "https://prayer-tracker-14.preview.emergentagent.com/api"

def test_health_endpoint():
    """Test GET /api should return {"message":"Hello World"}"""
    print("🔍 Testing Health Endpoint (GET /api)...")
    try:
        response = requests.get(f"{BASE_URL}/")
        print(f"   Status Code: {response.status_code}")
        print(f"   Response: {response.json()}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get("message") == "Hello World":
                print("   ✅ PASS: Health endpoint working correctly")
                return True
            else:
                print(f"   ❌ FAIL: Expected message 'Hello World', got {data}")
                return False
        else:
            print(f"   ❌ FAIL: Expected status 200, got {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ ERROR: {str(e)}")
        return False

def test_status_endpoints():
    """Test POST /api/status and GET /api/status"""
    print("\n🔍 Testing Status Endpoints...")
    
    # Test POST /api/status
    print("   Testing POST /api/status...")
    try:
        payload = {"client_name": "mobile_regression_test"}
        response = requests.post(f"{BASE_URL}/status", json=payload)
        print(f"   POST Status Code: {response.status_code}")
        print(f"   POST Response: {response.json()}")
        
        if response.status_code == 200:
            data = response.json()
            if "id" in data and "timestamp" in data and data.get("client_name") == "mobile_regression_test":
                print("   ✅ PASS: POST /api/status working correctly")
                post_success = True
            else:
                print(f"   ❌ FAIL: Missing required fields in response: {data}")
                post_success = False
        else:
            print(f"   ❌ FAIL: Expected status 200, got {response.status_code}")
            post_success = False
    except Exception as e:
        print(f"   ❌ ERROR: {str(e)}")
        post_success = False
    
    # Test GET /api/status
    print("   Testing GET /api/status...")
    try:
        response = requests.get(f"{BASE_URL}/status")
        print(f"   GET Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   GET Response: Found {len(data)} status checks")
            if len(data) >= 1:
                print("   ✅ PASS: GET /api/status returns at least one record")
                get_success = True
            else:
                print("   ❌ FAIL: No status checks found")
                get_success = False
        else:
            print(f"   ❌ FAIL: Expected status 200, got {response.status_code}")
            get_success = False
    except Exception as e:
        print(f"   ❌ ERROR: {str(e)}")
        get_success = False
    
    return post_success and get_success

def test_quran_surahs():
    """Test GET /api/quran/surahs returns 103 surahs (complete Quran)"""
    print("\n🔍 Testing Qur'an Surahs Endpoint (GET /api/quran/surahs)...")
    try:
        response = requests.get(f"{BASE_URL}/quran/surahs")
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   Response: Found {len(data)} surahs")
            
            # Verify we have 103 surahs (complete Quran)
            if len(data) == 103:
                print("   ✅ PASS: Complete Quran with 103 surahs confirmed")
                
                # Check if Al-Fatiha is in the list
                al_fatiha_found = False
                for surah in data:
                    if surah.get("nameAr") == "الفاتحة" and surah.get("number") == 1:
                        al_fatiha_found = True
                        print(f"   Found Al-Fatiha: {surah}")
                        break
                
                if al_fatiha_found:
                    print("   ✅ PASS: Al-Fatiha found with correct structure")
                    return True
                else:
                    print("   ❌ FAIL: Al-Fatiha not found in surahs list")
                    return False
            else:
                print(f"   ❌ FAIL: Expected 103 surahs, got {len(data)}")
                return False
        else:
            print(f"   ❌ FAIL: Expected status 200, got {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ ERROR: {str(e)}")
        return False

def test_quran_search_arabic():
    """Test GET /api/quran/search?query=الْحَمْدُ should return Al-Fatiha 1:2"""
    print("\n🔍 Testing Qur'an Search - Arabic (GET /api/quran/search?query=الْحَمْدُ)...")
    try:
        # Using Arabic text with diacritical marks as stored in the data
        response = requests.get(f"{BASE_URL}/quran/search", params={"query": "الْحَمْدُ"})
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            results = data.get("results", [])
            print(f"   Response: Found {len(results)} results")
            
            # Check if Al-Fatiha 1:2 is in results
            al_fatiha_1_2_found = False
            for result in results:
                if (result.get("surahNumber") == 1 and result.get("ayah") == 2 and 
                    "الْحَمْدُ" in result.get("textAr", "")):
                    al_fatiha_1_2_found = True
                    print(f"   Found Al-Fatiha 1:2: {result.get('textAr')}")
                    break
            
            if al_fatiha_1_2_found:
                print("   ✅ PASS: Arabic search returns Al-Fatiha 1:2")
                return True
            else:
                print("   ❌ FAIL: Al-Fatiha 1:2 not found in Arabic search results")
                return False
        else:
            print(f"   ❌ FAIL: Expected status 200, got {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ ERROR: {str(e)}")
        return False

def test_quran_search_tafseer():
    """Test GET /api/quran/search?query=الْحَمْدُ&bilingual=tafseer"""
    print("\n🔍 Testing Qur'an Search - Tafseer (GET /api/quran/search?query=الْحَمْدُ&bilingual=tafseer)...")
    try:
        response = requests.get(f"{BASE_URL}/quran/search", params={"query": "الْحَمْدُ", "bilingual": "tafseer"})
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            results = data.get("results", [])
            print(f"   Response: Found {len(results)} results")
            
            # Check if results include tafseer (Arabic interpretation)
            tafseer_found = False
            for result in results:
                if result.get("tafseer") is not None and result.get("tafseer").strip():
                    tafseer_found = True
                    print(f"   Found result with tafseer: {result.get('tafseer')[:100]}...")
                    break
            
            if tafseer_found and len(results) > 0:
                print("   ✅ PASS: Tafseer search returns results with Arabic interpretations")
                return True
            else:
                print("   ❌ FAIL: No results with tafseer found")
                return False
        else:
            print(f"   ❌ FAIL: Expected status 200, got {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ ERROR: {str(e)}")
        return False

def test_quran_search_comprehensive():
    """Test comprehensive Arabic search functionality with different queries"""
    print("\n🔍 Testing Comprehensive Qur'an Search...")
    
    test_queries = [
        ("الله", "Search for Allah"),
        ("رب", "Search for Rabb (Lord)"),
        ("الرحمن", "Search for Ar-Rahman")
    ]
    
    all_passed = True
    
    for query, description in test_queries:
        print(f"   Testing: {description} (query: {query})")
        try:
            response = requests.get(f"{BASE_URL}/quran/search", params={"query": query})
            if response.status_code == 200:
                data = response.json()
                results = data.get("results", [])
                if len(results) > 0:
                    print(f"   ✅ {description}: Found {len(results)} results")
                else:
                    print(f"   ❌ {description}: No results found")
                    all_passed = False
            else:
                print(f"   ❌ {description}: HTTP {response.status_code}")
                all_passed = False
        except Exception as e:
            print(f"   ❌ {description}: ERROR {str(e)}")
            all_passed = False
    
    return all_passed

def main():
    """Run all backend tests for mobile regression testing"""
    print("🚀 Starting Comprehensive Backend API Tests for ALSABQON")
    print("📱 Mobile Regression Testing After Fixes")
    print(f"🌐 Testing against: {BASE_URL}")
    print("=" * 70)
    
    test_results = []
    
    # Run all tests as specified in the review request
    test_results.append(("Health Endpoint", test_health_endpoint()))
    test_results.append(("Status Endpoints", test_status_endpoints()))
    test_results.append(("Qur'an Surahs (103 Complete)", test_quran_surahs()))
    test_results.append(("Qur'an Search Arabic", test_quran_search_arabic()))
    test_results.append(("Qur'an Search Tafseer", test_quran_search_tafseer()))
    test_results.append(("Comprehensive Search", test_quran_search_comprehensive()))
    
    # Summary
    print("\n" + "=" * 70)
    print("📊 MOBILE REGRESSION TEST SUMMARY")
    print("=" * 70)
    
    passed = 0
    failed = 0
    
    for test_name, result in test_results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
        if result:
            passed += 1
        else:
            failed += 1
    
    print(f"\n📈 Results: {passed} passed, {failed} failed")
    
    if failed == 0:
        print("🎉 All mobile regression tests passed!")
        print("✅ Backend APIs are stable after mobile fixes")
        return 0
    else:
        print("⚠️  Some tests failed - requires investigation")
        return 1

if __name__ == "__main__":
    sys.exit(main())