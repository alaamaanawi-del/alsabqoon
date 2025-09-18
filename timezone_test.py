#!/usr/bin/env python3
"""
Timezone and Date Handling Testing Script for ALSABQON Prayer Tracker
Tests the timezone and date handling fixes implemented in the backend
"""

import requests
import json
import sys
from datetime import datetime, timezone, timedelta
import pytz

# Use the production URL from frontend/.env
BASE_URL = "https://alsabqon-app-1.preview.emergentagent.com/api"

def test_azkar_entry_with_client_timestamp():
    """Test creating azkar entry with client-side timestamp"""
    print("🔍 Testing Azkar Entry Creation with Client Timestamp...")
    
    # Test with different timezones
    test_cases = [
        {
            "name": "New York timezone (EST)",
            "timezone": "America/New_York",
            "client_timestamp": "2025-01-15T23:30:00-05:00",  # 11:30 PM EST
            "expected_date": "2025-01-15"
        },
        {
            "name": "Dubai timezone (GST)",
            "timezone": "Asia/Dubai", 
            "client_timestamp": "2025-01-16T01:30:00+04:00",  # 1:30 AM GST (same UTC as above)
            "expected_date": "2025-01-16"
        },
        {
            "name": "London timezone (GMT)",
            "timezone": "Europe/London",
            "client_timestamp": "2025-01-16T04:30:00+00:00",  # 4:30 AM GMT
            "expected_date": "2025-01-16"
        }
    ]
    
    all_passed = True
    created_entries = []
    
    for test_case in test_cases:
        print(f"   Testing: {test_case['name']}")
        
        entry_data = {
            "zikr_id": 1,
            "count": 33,
            "date": test_case["expected_date"],
            "timezone": test_case["timezone"],
            "client_timestamp": test_case["client_timestamp"]
        }
        
        try:
            response = requests.post(f"{BASE_URL}/azkar/entry", json=entry_data)
            print(f"   Status Code: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify the entry was created with correct date
                if data["date"] == test_case["expected_date"]:
                    print(f"   ✅ PASS: Entry created with correct date {data['date']}")
                    
                    # Verify timestamp was properly handled
                    if "timestamp" in data:
                        print(f"   ✅ PASS: Timestamp stored: {data['timestamp']}")
                        created_entries.append(data)
                    else:
                        print("   ❌ FAIL: No timestamp in response")
                        all_passed = False
                else:
                    print(f"   ❌ FAIL: Expected date {test_case['expected_date']}, got {data['date']}")
                    all_passed = False
            else:
                print(f"   ❌ FAIL: Expected status 200, got {response.status_code}")
                all_passed = False
                
        except Exception as e:
            print(f"   ❌ ERROR: {str(e)}")
            all_passed = False
    
    print(f"   Created {len(created_entries)} entries with client timestamps")
    return all_passed

def test_charity_entry_with_client_timestamp():
    """Test creating charity entry with client-side timestamp"""
    print("\n🔍 Testing Charity Entry Creation with Client Timestamp...")
    
    # Test with different timezones around midnight
    test_cases = [
        {
            "name": "Just after midnight in Riyadh",
            "timezone": "Asia/Riyadh",
            "client_timestamp": "2025-01-16T00:15:00+03:00",  # 12:15 AM AST
            "expected_date": "2025-01-16",
            "comments": "صدقة بعد منتصف الليل في الرياض"
        },
        {
            "name": "Just before midnight in New York", 
            "timezone": "America/New_York",
            "client_timestamp": "2025-01-15T23:45:00-05:00",  # 11:45 PM EST
            "expected_date": "2025-01-15",
            "comments": "Charity before midnight in New York"
        },
        {
            "name": "Noon in Tokyo",
            "timezone": "Asia/Tokyo",
            "client_timestamp": "2025-01-16T12:00:00+09:00",  # 12:00 PM JST
            "expected_date": "2025-01-16", 
            "comments": "正午の慈善 (Noon charity)"
        }
    ]
    
    all_passed = True
    created_entries = []
    
    for test_case in test_cases:
        print(f"   Testing: {test_case['name']}")
        
        entry_data = {
            "charity_id": 1,
            "count": 10,
            "date": test_case["expected_date"],
            "comments": test_case["comments"],
            "timezone": test_case["timezone"],
            "client_timestamp": test_case["client_timestamp"]
        }
        
        try:
            response = requests.post(f"{BASE_URL}/charities/entry", json=entry_data)
            print(f"   Status Code: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify the entry was created with correct date
                if data["date"] == test_case["expected_date"]:
                    print(f"   ✅ PASS: Entry created with correct date {data['date']}")
                    
                    # Verify comments were preserved
                    if data["comments"] == test_case["comments"]:
                        print(f"   ✅ PASS: Comments preserved: {data['comments']}")
                        created_entries.append(data)
                    else:
                        print(f"   ❌ FAIL: Comments not preserved correctly")
                        all_passed = False
                else:
                    print(f"   ❌ FAIL: Expected date {test_case['expected_date']}, got {data['date']}")
                    all_passed = False
            else:
                print(f"   ❌ FAIL: Expected status 200, got {response.status_code}")
                all_passed = False
                
        except Exception as e:
            print(f"   ❌ ERROR: {str(e)}")
            all_passed = False
    
    print(f"   Created {len(created_entries)} charity entries with client timestamps")
    return all_passed

def test_date_boundary_handling_azkar():
    """Test date boundary handling for azkar daily endpoint"""
    print("\n🔍 Testing Date Boundary Handling - Azkar Daily Endpoint...")
    
    # Get today's date in different formats
    today = datetime.now().strftime("%Y-%m-%d")
    yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
    tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    
    test_dates = [today, yesterday, tomorrow, "2025-01-15", "2025-01-16"]
    
    all_passed = True
    
    for test_date in test_dates:
        print(f"   Testing daily azkar for date: {test_date}")
        
        try:
            response = requests.get(f"{BASE_URL}/azkar/daily/{test_date}")
            print(f"   Status Code: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify response structure
                required_fields = ["date", "total_daily", "azkar_summary", "entries"]
                if all(field in data for field in required_fields):
                    print(f"   ✅ PASS: Daily azkar structure correct for {test_date}")
                    print(f"   Total daily: {data['total_daily']}, Entries: {len(data['entries'])}")
                    
                    # Verify date matches request
                    if data["date"] == test_date:
                        print(f"   ✅ PASS: Date filtering working correctly")
                    else:
                        print(f"   ❌ FAIL: Date mismatch - requested {test_date}, got {data['date']}")
                        all_passed = False
                        
                    # Verify all entries are for the correct date
                    for entry in data["entries"]:
                        if entry["date"] != test_date:
                            print(f"   ❌ FAIL: Entry with wrong date found: {entry['date']} (expected {test_date})")
                            all_passed = False
                            break
                    else:
                        if data["entries"]:
                            print(f"   ✅ PASS: All {len(data['entries'])} entries have correct date")
                        
                else:
                    print(f"   ❌ FAIL: Missing required fields in response")
                    all_passed = False
            else:
                print(f"   ❌ FAIL: Expected status 200, got {response.status_code}")
                all_passed = False
                
        except Exception as e:
            print(f"   ❌ ERROR: {str(e)}")
            all_passed = False
    
    return all_passed

def test_date_boundary_handling_charities():
    """Test date boundary handling for charities daily endpoint"""
    print("\n🔍 Testing Date Boundary Handling - Charities Daily Endpoint...")
    
    # Get today's date in different formats
    today = datetime.now().strftime("%Y-%m-%d")
    yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
    tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    
    test_dates = [today, yesterday, tomorrow, "2025-01-15", "2025-01-16"]
    
    all_passed = True
    
    for test_date in test_dates:
        print(f"   Testing daily charities for date: {test_date}")
        
        try:
            response = requests.get(f"{BASE_URL}/charities/daily/{test_date}")
            print(f"   Status Code: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify response structure
                required_fields = ["date", "total_daily", "charity_summary", "entries"]
                if all(field in data for field in required_fields):
                    print(f"   ✅ PASS: Daily charities structure correct for {test_date}")
                    print(f"   Total daily: {data['total_daily']}, Entries: {len(data['entries'])}")
                    
                    # Verify date matches request
                    if data["date"] == test_date:
                        print(f"   ✅ PASS: Date filtering working correctly")
                    else:
                        print(f"   ❌ FAIL: Date mismatch - requested {test_date}, got {data['date']}")
                        all_passed = False
                        
                    # Verify all entries are for the correct date
                    for entry in data["entries"]:
                        if entry["date"] != test_date:
                            print(f"   ❌ FAIL: Entry with wrong date found: {entry['date']} (expected {test_date})")
                            all_passed = False
                            break
                    else:
                        if data["entries"]:
                            print(f"   ✅ PASS: All {len(data['entries'])} entries have correct date")
                        
                else:
                    print(f"   ❌ FAIL: Missing required fields in response")
                    all_passed = False
            else:
                print(f"   ❌ FAIL: Expected status 200, got {response.status_code}")
                all_passed = False
                
        except Exception as e:
            print(f"   ❌ ERROR: {str(e)}")
            all_passed = False
    
    return all_passed

def test_midnight_edge_cases():
    """Test edge cases around midnight for both azkar and charity entries"""
    print("\n🔍 Testing Midnight Edge Cases...")
    
    # Create entries with timestamps around midnight
    midnight_test_cases = [
        {
            "type": "azkar",
            "name": "Just after midnight UTC",
            "client_timestamp": "2025-01-16T00:01:00+00:00",
            "timezone": "UTC",
            "expected_date": "2025-01-16",
            "data": {"zikr_id": 1, "count": 50}
        },
        {
            "type": "azkar", 
            "name": "Just before midnight UTC",
            "client_timestamp": "2025-01-15T23:59:00+00:00",
            "timezone": "UTC",
            "expected_date": "2025-01-15",
            "data": {"zikr_id": 6, "count": 25}
        },
        {
            "type": "charity",
            "name": "Midnight in Dubai",
            "client_timestamp": "2025-01-16T00:00:00+04:00",
            "timezone": "Asia/Dubai",
            "expected_date": "2025-01-16",
            "data": {"charity_id": 1, "count": 15, "comments": "صدقة منتصف الليل في دبي"}
        },
        {
            "type": "charity",
            "name": "11:59 PM in New York",
            "client_timestamp": "2025-01-15T23:59:00-05:00",
            "timezone": "America/New_York", 
            "expected_date": "2025-01-15",
            "data": {"charity_id": 6, "count": 5, "comments": "Last minute charity in NYC"}
        }
    ]
    
    all_passed = True
    created_entries = []
    
    for test_case in midnight_test_cases:
        print(f"   Testing: {test_case['name']} ({test_case['type']})")
        
        # Prepare entry data
        entry_data = test_case["data"].copy()
        entry_data.update({
            "date": test_case["expected_date"],
            "timezone": test_case["timezone"],
            "client_timestamp": test_case["client_timestamp"]
        })
        
        # Choose endpoint based on type
        endpoint = f"{BASE_URL}/{test_case['type']}/entry" if test_case['type'] == 'azkar' else f"{BASE_URL}/charities/entry"
        
        try:
            response = requests.post(endpoint, json=entry_data)
            print(f"   Status Code: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                
                # Verify the entry was created with correct date
                if data["date"] == test_case["expected_date"]:
                    print(f"   ✅ PASS: Midnight edge case handled correctly - date: {data['date']}")
                    created_entries.append({
                        "type": test_case["type"],
                        "id": data["id"],
                        "date": data["date"],
                        "timestamp": data["timestamp"]
                    })
                else:
                    print(f"   ❌ FAIL: Expected date {test_case['expected_date']}, got {data['date']}")
                    all_passed = False
            else:
                print(f"   ❌ FAIL: Expected status 200, got {response.status_code}")
                all_passed = False
                
        except Exception as e:
            print(f"   ❌ ERROR: {str(e)}")
            all_passed = False
    
    # Now verify that the entries can be retrieved correctly by date
    print("   Verifying midnight entries can be retrieved by correct date...")
    
    for entry in created_entries:
        try:
            endpoint = f"{BASE_URL}/{entry['type']}/daily/{entry['date']}" if entry['type'] == 'azkar' else f"{BASE_URL}/charities/daily/{entry['date']}"
            response = requests.get(endpoint)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check if our entry is in the daily results
                found = False
                for daily_entry in data["entries"]:
                    if daily_entry["id"] == entry["id"]:
                        found = True
                        break
                
                if found:
                    print(f"   ✅ PASS: Midnight entry {entry['id']} found in daily results for {entry['date']}")
                else:
                    print(f"   ❌ FAIL: Midnight entry {entry['id']} not found in daily results for {entry['date']}")
                    all_passed = False
            else:
                print(f"   ❌ FAIL: Could not retrieve daily data for {entry['date']}")
                all_passed = False
                
        except Exception as e:
            print(f"   ❌ ERROR verifying midnight entry: {str(e)}")
            all_passed = False
    
    print(f"   Created and verified {len(created_entries)} midnight edge case entries")
    return all_passed

def test_timezone_consistency():
    """Test that timezone handling is consistent across different operations"""
    print("\n🔍 Testing Timezone Consistency...")
    
    # Test with a specific timezone and timestamp
    test_timezone = "Asia/Dubai"
    test_timestamp = "2025-01-16T14:30:00+04:00"  # 2:30 PM GST
    test_date = "2025-01-16"
    
    all_passed = True
    
    # Step 1: Create an azkar entry with specific timezone
    print("   Step 1: Creating azkar entry with Dubai timezone...")
    azkar_data = {
        "zikr_id": 1,
        "count": 100,
        "date": test_date,
        "timezone": test_timezone,
        "client_timestamp": test_timestamp
    }
    
    try:
        response = requests.post(f"{BASE_URL}/azkar/entry", json=azkar_data)
        if response.status_code == 200:
            azkar_entry = response.json()
            print(f"   ✅ Azkar entry created: {azkar_entry['id']}")
        else:
            print(f"   ❌ FAIL: Could not create azkar entry")
            return False
    except Exception as e:
        print(f"   ❌ ERROR creating azkar entry: {str(e)}")
        return False
    
    # Step 2: Create a charity entry with same timezone
    print("   Step 2: Creating charity entry with same timezone...")
    charity_data = {
        "charity_id": 1,
        "count": 50,
        "date": test_date,
        "comments": "صدقة في دبي",
        "timezone": test_timezone,
        "client_timestamp": test_timestamp
    }
    
    try:
        response = requests.post(f"{BASE_URL}/charities/entry", json=charity_data)
        if response.status_code == 200:
            charity_entry = response.json()
            print(f"   ✅ Charity entry created: {charity_entry['id']}")
        else:
            print(f"   ❌ FAIL: Could not create charity entry")
            return False
    except Exception as e:
        print(f"   ❌ ERROR creating charity entry: {str(e)}")
        return False
    
    # Step 3: Verify both entries appear in daily summaries for the same date
    print("   Step 3: Verifying entries appear in daily summaries...")
    
    # Check azkar daily
    try:
        response = requests.get(f"{BASE_URL}/azkar/daily/{test_date}")
        if response.status_code == 200:
            data = response.json()
            found = any(entry["id"] == azkar_entry["id"] for entry in data["entries"])
            if found:
                print(f"   ✅ PASS: Azkar entry found in daily summary for {test_date}")
            else:
                print(f"   ❌ FAIL: Azkar entry not found in daily summary")
                all_passed = False
        else:
            print(f"   ❌ FAIL: Could not get azkar daily summary")
            all_passed = False
    except Exception as e:
        print(f"   ❌ ERROR checking azkar daily: {str(e)}")
        all_passed = False
    
    # Check charity daily
    try:
        response = requests.get(f"{BASE_URL}/charities/daily/{test_date}")
        if response.status_code == 200:
            data = response.json()
            found = any(entry["id"] == charity_entry["id"] for entry in data["entries"])
            if found:
                print(f"   ✅ PASS: Charity entry found in daily summary for {test_date}")
            else:
                print(f"   ❌ FAIL: Charity entry not found in daily summary")
                all_passed = False
        else:
            print(f"   ❌ FAIL: Could not get charity daily summary")
            all_passed = False
    except Exception as e:
        print(f"   ❌ ERROR checking charity daily: {str(e)}")
        all_passed = False
    
    # Step 4: Test update operations maintain timezone consistency
    print("   Step 4: Testing update operations maintain timezone consistency...")
    
    # Update azkar entry
    try:
        update_data = {
            "count": 150,
            "edit_note": "تحديث من دبي",
            "timezone": test_timezone,
            "client_timestamp": "2025-01-16T15:00:00+04:00"  # 30 minutes later
        }
        response = requests.put(f"{BASE_URL}/azkar/entry/{azkar_entry['id']}", json=update_data)
        if response.status_code == 200:
            result = response.json()
            if result.get("success"):
                print(f"   ✅ PASS: Azkar entry updated successfully with timezone consistency")
            else:
                print(f"   ❌ FAIL: Azkar update failed")
                all_passed = False
        else:
            print(f"   ❌ FAIL: Azkar update request failed")
            all_passed = False
    except Exception as e:
        print(f"   ❌ ERROR updating azkar entry: {str(e)}")
        all_passed = False
    
    return all_passed

def run_all_timezone_tests():
    """Run all timezone and date handling tests"""
    print("🌍 TIMEZONE AND DATE HANDLING TESTING SUITE")
    print("=" * 60)
    
    test_results = []
    
    # Run all tests
    test_results.append(("Azkar Entry with Client Timestamp", test_azkar_entry_with_client_timestamp()))
    test_results.append(("Charity Entry with Client Timestamp", test_charity_entry_with_client_timestamp()))
    test_results.append(("Date Boundary Handling - Azkar", test_date_boundary_handling_azkar()))
    test_results.append(("Date Boundary Handling - Charities", test_date_boundary_handling_charities()))
    test_results.append(("Midnight Edge Cases", test_midnight_edge_cases()))
    test_results.append(("Timezone Consistency", test_timezone_consistency()))
    
    # Print summary
    print("\n" + "=" * 60)
    print("🌍 TIMEZONE TESTING SUMMARY")
    print("=" * 60)
    
    passed = 0
    failed = 0
    
    for test_name, result in test_results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
        if result:
            passed += 1
        else:
            failed += 1
    
    print(f"\nTotal Tests: {len(test_results)}")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    
    if failed == 0:
        print("\n🎉 ALL TIMEZONE TESTS PASSED!")
        return True
    else:
        print(f"\n❌ {failed} TIMEZONE TESTS FAILED!")
        return False

if __name__ == "__main__":
    success = run_all_timezone_tests()
    sys.exit(0 if success else 1)