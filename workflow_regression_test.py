#!/usr/bin/env python3
"""
Workflow Navigation Fix Regression Test for ALSABQON Prayer Tracker
Focus: Testing backend functionality after workflow navigation fix implementation
Priority: Health check, core prayer/azkar/charity functionality, Dawah category
"""

import requests
import json
import sys
from datetime import datetime

# Use the production URL from frontend/.env
BASE_URL = "https://alsabqon-app-1.preview.emergentagent.com/api"

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

def test_azkar_list():
    """Test GET /api/azkar returns list of azkar including Dawah category"""
    print("\n🔍 Testing Azkar List Endpoint (GET /api/azkar)...")
    try:
        response = requests.get(f"{BASE_URL}/azkar")
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            azkar_list = data.get("azkar", [])
            print(f"   Response: Found {len(azkar_list)} azkar")
            
            # Verify we have 13 azkar (including Dawah)
            if len(azkar_list) == 13:
                print("   ✅ PASS: Found all 13 azkar types")
                
                # Check for Dawah category (ID 13)
                dawah_found = False
                for azkar in azkar_list:
                    if azkar.get("id") == 13:
                        dawah_found = True
                        print(f"   ✅ PASS: Dawah category found - Arabic: {azkar['nameAr']}, English: {azkar['nameEn']}")
                        break
                
                if dawah_found:
                    return True
                else:
                    print("   ❌ FAIL: Dawah category (ID 13) not found")
                    return False
            else:
                print(f"   ❌ FAIL: Expected 13 azkar, got {len(azkar_list)}")
                return False
        else:
            print(f"   ❌ FAIL: Expected status 200, got {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ ERROR: {str(e)}")
        return False

def test_azkar_entry_creation():
    """Test POST /api/azkar/entry creates zikr entries including Dawah with comments"""
    print("\n🔍 Testing Azkar Entry Creation (POST /api/azkar/entry)...")
    
    # Test data including Dawah category with comment
    test_entries = [
        {"zikr_id": 1, "count": 33, "date": "2024-01-15"},
        {"zikr_id": 6, "count": 100, "date": "2024-01-15"},
        {"zikr_id": 13, "count": 1, "date": "2024-01-15", "comment": "تعليم آيات الصلاة - الفجر (الركعة 1)"}  # Dawah with comment
    ]
    
    all_passed = True
    created_entries = []
    
    for entry_data in test_entries:
        print(f"   Creating entry: zikr_id={entry_data['zikr_id']}, count={entry_data['count']}")
        if 'comment' in entry_data:
            print(f"   With comment: {entry_data['comment']}")
        
        try:
            response = requests.post(f"{BASE_URL}/azkar/entry", json=entry_data)
            print(f"   Status Code: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["id", "user_id", "zikr_id", "count", "date", "timestamp"]
                if all(field in data for field in required_fields):
                    print(f"   ✅ PASS: Entry created with ID {data['id']}")
                    
                    # Special check for Dawah category with comment
                    if entry_data['zikr_id'] == 13 and 'comment' in entry_data:
                        if 'edit_notes' in data and len(data['edit_notes']) > 0:
                            if entry_data['comment'] in data['edit_notes'][0]:
                                print(f"   ✅ PASS: Dawah comment stored correctly in edit_notes")
                            else:
                                print(f"   ❌ FAIL: Dawah comment not stored correctly")
                                all_passed = False
                        else:
                            print(f"   ❌ FAIL: Dawah comment not found in edit_notes")
                            all_passed = False
                    
                    created_entries.append(data)
                else:
                    print(f"   ❌ FAIL: Missing required fields in response: {data}")
                    all_passed = False
            else:
                print(f"   ❌ FAIL: Expected status 200, got {response.status_code}")
                all_passed = False
        except Exception as e:
            print(f"   ❌ ERROR: {str(e)}")
            all_passed = False
    
    print(f"   Created {len(created_entries)} entries successfully")
    return all_passed

def test_charity_list():
    """Test GET /api/charities returns list of 32 charity categories"""
    print("\n🔍 Testing Charity List Endpoint (GET /api/charities)...")
    try:
        response = requests.get(f"{BASE_URL}/charities")
        print(f"   Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            charity_list = data.get("charities", [])
            print(f"   Response: Found {len(charity_list)} charities")
            
            # Verify we have 32 charities
            if len(charity_list) == 32:
                print("   ✅ PASS: Found all 32 charity categories")
                
                # Check structure of first charity
                first_charity = charity_list[0]
                required_fields = ["id", "nameAr", "nameEn", "nameEs", "color", "description"]
                if all(field in first_charity for field in required_fields):
                    print(f"   ✅ PASS: Multi-language charity structure correct")
                    print(f"   Arabic: {first_charity['nameAr']}")
                    print(f"   English: {first_charity['nameEn']}")
                    return True
                else:
                    print(f"   ❌ FAIL: Missing required fields in charity structure")
                    return False
            else:
                print(f"   ❌ FAIL: Expected 32 charities, got {len(charity_list)}")
                return False
        else:
            print(f"   ❌ FAIL: Expected status 200, got {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ ERROR: {str(e)}")
        return False

def test_charity_entry_creation():
    """Test POST /api/charities/entry creates charity entries"""
    print("\n🔍 Testing Charity Entry Creation (POST /api/charities/entry)...")
    
    # Test data for different charities
    test_entries = [
        {"charity_id": 1, "count": 5, "date": "2024-01-15", "comments": "صدقة الصباح - خمس ريالات"},
        {"charity_id": 6, "count": 2, "date": "2024-01-15", "comments": "إطعام فقير - وجبتان"},
        {"charity_id": 26, "count": 1, "date": "2024-01-16", "comments": "كفالة يتيم شهرية"}
    ]
    
    all_passed = True
    created_entries = []
    
    for entry_data in test_entries:
        print(f"   Creating charity entry: charity_id={entry_data['charity_id']}, count={entry_data['count']}")
        try:
            response = requests.post(f"{BASE_URL}/charities/entry", json=entry_data)
            print(f"   Status Code: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["id", "user_id", "charity_id", "count", "date", "timestamp", "comments"]
                if all(field in data for field in required_fields):
                    print(f"   ✅ PASS: Charity entry created with ID {data['id']}")
                    created_entries.append(data)
                else:
                    print(f"   ❌ FAIL: Missing required fields in response")
                    all_passed = False
            else:
                print(f"   ❌ FAIL: Expected status 200, got {response.status_code}")
                all_passed = False
        except Exception as e:
            print(f"   ❌ ERROR: {str(e)}")
            all_passed = False
    
    print(f"   Created {len(created_entries)} charity entries successfully")
    return all_passed

def test_dawah_category_integration():
    """Test Dawah category (ID 13) integration with prayer workflow"""
    print("\n🔍 Testing Dawah Category Integration (ID 13)...")
    
    test_date = "2024-01-20"
    
    # Step 1: Create Dawah entry with prayer-related comment
    print("   Step 1: Creating Dawah entry with prayer comment...")
    dawah_entry = {
        "zikr_id": 13,
        "count": 1,
        "date": test_date,
        "comment": "تعليم آيات الصلاة - الفجر (الركعة 1)"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/azkar/entry", json=dawah_entry)
        if response.status_code == 200:
            data = response.json()
            if data.get("zikr_id") == 13 and "edit_notes" in data:
                print("   ✅ PASS: Dawah entry created with prayer comment")
                entry_id = data["id"]
            else:
                print("   ❌ FAIL: Dawah entry creation failed")
                return False
        else:
            print(f"   ❌ FAIL: Dawah entry creation failed with status {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ ERROR creating Dawah entry: {str(e)}")
        return False
    
    # Step 2: Test Dawah statistics
    print("   Step 2: Testing Dawah statistics...")
    try:
        response = requests.get(f"{BASE_URL}/azkar/13/stats")
        if response.status_code == 200:
            stats = response.json()
            if stats.get("zikr_id") == 13 and stats.get("total_count") >= 1:
                print(f"   ✅ PASS: Dawah stats - Total: {stats['total_count']}, Sessions: {stats['total_sessions']}")
            else:
                print(f"   ❌ FAIL: Dawah stats incorrect: {stats}")
                return False
        else:
            print(f"   ❌ FAIL: Dawah stats failed with status {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ ERROR testing Dawah stats: {str(e)}")
        return False
    
    # Step 3: Test Dawah in daily summary
    print("   Step 3: Testing Dawah in daily summary...")
    try:
        response = requests.get(f"{BASE_URL}/azkar/daily/{test_date}")
        if response.status_code == 200:
            daily = response.json()
            azkar_summary = daily.get("azkar_summary", {})
            if "13" in azkar_summary:
                dawah_summary = azkar_summary["13"]
                print(f"   ✅ PASS: Dawah in daily summary - Count: {dawah_summary['count']}")
            else:
                print("   ❌ FAIL: Dawah not found in daily summary")
                return False
        else:
            print(f"   ❌ FAIL: Daily summary failed with status {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ ERROR testing daily summary: {str(e)}")
        return False
    
    print("   🎉 DAWAH CATEGORY INTEGRATION TESTS PASSED!")
    return True

def test_score_computation_endpoints():
    """Test endpoints that might interact with score computation"""
    print("\n🔍 Testing Score Computation Related Endpoints...")
    
    # Test azkar stats (used for score computation)
    print("   Testing azkar statistics endpoints...")
    test_zikr_ids = [1, 6, 13]
    all_passed = True
    
    for zikr_id in test_zikr_ids:
        try:
            response = requests.get(f"{BASE_URL}/azkar/{zikr_id}/stats")
            if response.status_code == 200:
                stats = response.json()
                required_fields = ["zikr_id", "total_count", "total_sessions", "last_entry"]
                if all(field in stats for field in required_fields):
                    print(f"   ✅ PASS: Stats for zikr_id={zikr_id} - Total: {stats['total_count']}")
                else:
                    print(f"   ❌ FAIL: Missing fields in stats for zikr_id={zikr_id}")
                    all_passed = False
            else:
                print(f"   ❌ FAIL: Stats endpoint failed for zikr_id={zikr_id}")
                all_passed = False
        except Exception as e:
            print(f"   ❌ ERROR testing stats for zikr_id={zikr_id}: {str(e)}")
            all_passed = False
    
    # Test charity stats (used for score computation)
    print("   Testing charity statistics endpoints...")
    test_charity_ids = [1, 6, 26]
    
    for charity_id in test_charity_ids:
        try:
            response = requests.get(f"{BASE_URL}/charities/{charity_id}/stats")
            if response.status_code == 200:
                stats = response.json()
                required_fields = ["charity_id", "total_count", "total_sessions", "last_entry"]
                if all(field in stats for field in required_fields):
                    print(f"   ✅ PASS: Charity stats for charity_id={charity_id} - Total: {stats['total_count']}")
                else:
                    print(f"   ❌ FAIL: Missing fields in charity stats for charity_id={charity_id}")
                    all_passed = False
            else:
                print(f"   ❌ FAIL: Charity stats endpoint failed for charity_id={charity_id}")
                all_passed = False
        except Exception as e:
            print(f"   ❌ ERROR testing charity stats for charity_id={charity_id}: {str(e)}")
            all_passed = False
    
    return all_passed

def main():
    """Run focused backend tests for workflow navigation fix regression testing"""
    print("🚀 ALSABQON Backend API Testing - Workflow Navigation Fix Regression Test")
    print("=" * 80)
    print("CONTEXT: Testing after workflow navigation fix implementation")
    print("FOCUS: Health check, core prayer/azkar/charity functionality, Dawah category")
    print("PRIORITY: Ensure no regression after score computation fix")
    print("=" * 80)
    
    # Priority test functions based on review request
    test_functions = [
        ("Health Endpoint", test_health_endpoint),
        ("Azkar List (including Dawah)", test_azkar_list),
        ("Azkar Entry Creation", test_azkar_entry_creation),
        ("Charity List", test_charity_list),
        ("Charity Entry Creation", test_charity_entry_creation),
        ("Dawah Category Integration", test_dawah_category_integration),
        ("Score Computation Endpoints", test_score_computation_endpoints),
    ]
    
    # Run priority tests
    results = []
    for test_name, test_func in test_functions:
        print(f"\n{'='*60}")
        print(f"Running: {test_name}")
        print('='*60)
        
        try:
            result = test_func()
            results.append((test_name, result))
            if result:
                print(f"✅ {test_name}: PASSED")
            else:
                print(f"❌ {test_name}: FAILED")
        except Exception as e:
            print(f"❌ {test_name}: ERROR - {str(e)}")
            results.append((test_name, False))
    
    # Print summary
    print(f"\n{'='*80}")
    print("🏁 WORKFLOW NAVIGATION FIX REGRESSION TEST SUMMARY")
    print('='*80)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    print(f"\n📊 Results: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
    
    if passed == total:
        print("🎉 ALL PRIORITY TESTS PASSED! No regression detected after workflow navigation fix.")
        print("✅ Health endpoint working correctly")
        print("✅ Core azkar functionality intact")
        print("✅ Dawah category (ID 13) fully functional")
        print("✅ Core charity functionality intact")
        print("✅ Score computation endpoints working")
        return True
    else:
        print(f"⚠️  {total-passed} tests failed. Backend regression detected.")
        print("❌ Manual investigation required")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)