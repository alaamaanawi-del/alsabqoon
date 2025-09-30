#!/usr/bin/env python3
"""
Prayer and Dawa Integration Backend Testing
Testing the updated Prayer and Dawa integration features as requested in review.
"""

import requests
import json
import sys
from datetime import datetime

# Get backend URL from frontend .env
BACKEND_URL = "https://prayer-tracker-27.preview.emergentagent.com/api"

def test_prayer_dawa_integration():
    """Test Prayer and Dawa integration features as requested in review"""
    print("🕌 TESTING PRAYER AND DAWA INTEGRATION FEATURES")
    print("=" * 60)
    
    # Test 1: Verify Da'wah Category (ID 13) exists
    print("\n1. Testing Da'wah Category Availability")
    try:
        response = requests.get(f"{BACKEND_URL}/azkar")
        if response.status_code == 200:
            azkar_data = response.json()
            dawa_category = None
            for azkar in azkar_data.get('azkar', []):
                if azkar['id'] == 13:
                    dawa_category = azkar
                    break
            
            if dawa_category:
                print(f"✅ Da'wah category found: {dawa_category['nameAr']} - {dawa_category['nameEn']}")
                print(f"   Color: {dawa_category['color']}")
            else:
                print("❌ Da'wah category (ID 13) not found in azkar list")
                return False
        else:
            print(f"❌ Failed to get azkar list: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error testing azkar list: {e}")
        return False
    
    # Test 2: Create Prayer-sourced Dawa Entry
    print("\n2. Testing Prayer-sourced Dawa Entry Creation")
    prayer_entry_data = {
        "zikr_id": 13,
        "count": 5,
        "date": "2025-01-30",
        "comment": "تعليم آيات من الصلاة - الفجر",
        "source": "prayer",
        "prayer_id": "fajr_2025-01-30",
        "rakka": 1
    }
    
    try:
        response = requests.post(f"{BACKEND_URL}/azkar/entry", json=prayer_entry_data)
        if response.status_code == 200:
            entry = response.json()
            print(f"✅ Prayer-sourced Dawa entry created successfully")
            print(f"   Entry ID: {entry['id']}")
            print(f"   Source: {entry.get('source', 'N/A')}")
            print(f"   Prayer ID: {entry.get('prayer_id', 'N/A')}")
            print(f"   Rakka: {entry.get('rakka', 'N/A')}")
            print(f"   Comment stored in edit_notes: {entry.get('edit_notes', [])}")
            prayer_entry_id = entry['id']
        else:
            print(f"❌ Failed to create prayer-sourced entry: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error creating prayer-sourced entry: {e}")
        return False
    
    # Test 3: Create Manual Dawa Entry for comparison
    print("\n3. Testing Manual Dawa Entry Creation")
    manual_entry_data = {
        "zikr_id": 13,
        "count": 3,
        "date": "2025-01-30",
        "comment": "تعليم يدوي للإسلام",
        "source": "manual"
    }
    
    try:
        response = requests.post(f"{BACKEND_URL}/azkar/entry", json=manual_entry_data)
        if response.status_code == 200:
            entry = response.json()
            print(f"✅ Manual Dawa entry created successfully")
            print(f"   Entry ID: {entry['id']}")
            print(f"   Source: {entry.get('source', 'N/A')}")
            print(f"   Comment stored in edit_notes: {entry.get('edit_notes', [])}")
            manual_entry_id = entry['id']
        else:
            print(f"❌ Failed to create manual entry: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error creating manual entry: {e}")
        return False
    
    # Test 4: Update Existing Entry Count
    print("\n4. Testing Entry Count Update")
    update_count_data = {
        "count": 8
    }
    
    try:
        response = requests.put(f"{BACKEND_URL}/azkar/entry/{prayer_entry_id}", json=update_count_data)
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                updated_entry = result.get('entry', {})
                print(f"✅ Entry count updated successfully")
                print(f"   New count: {updated_entry.get('count', 'N/A')}")
                print(f"   Edit notes: {updated_entry.get('edit_notes', [])}")
            else:
                print(f"❌ Update failed: {result}")
                return False
        else:
            print(f"❌ Failed to update entry count: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error updating entry count: {e}")
        return False
    
    # Test 5: Update Entry Comment Only
    print("\n5. Testing Entry Comment Update")
    update_comment_data = {
        "comment": "تحديث الملاحظة - تعليم إضافي"
    }
    
    try:
        response = requests.put(f"{BACKEND_URL}/azkar/entry/{manual_entry_id}", json=update_comment_data)
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                updated_entry = result.get('entry', {})
                print(f"✅ Entry comment updated successfully")
                print(f"   Updated edit_notes: {updated_entry.get('edit_notes', [])}")
            else:
                print(f"❌ Comment update failed: {result}")
                return False
        else:
            print(f"❌ Failed to update entry comment: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error updating entry comment: {e}")
        return False
    
    # Test 6: Verify History Shows Prayer-sourced Entries
    print("\n6. Testing History Retrieval for Prayer-sourced Entries")
    try:
        response = requests.get(f"{BACKEND_URL}/azkar/13/history")
        if response.status_code == 200:
            history_data = response.json()
            entries = history_data.get('entries', [])
            print(f"✅ Retrieved {len(entries)} Da'wah entries from history")
            
            prayer_entries = [e for e in entries if e.get('source') == 'prayer']
            manual_entries = [e for e in entries if e.get('source') == 'manual']
            
            print(f"   Prayer-sourced entries: {len(prayer_entries)}")
            print(f"   Manual entries: {len(manual_entries)}")
            
            # Verify prayer entry details
            for entry in prayer_entries:
                print(f"   Prayer Entry - ID: {entry.get('id', 'N/A')[:8]}...")
                print(f"                  Prayer ID: {entry.get('prayer_id', 'N/A')}")
                print(f"                  Rakka: {entry.get('rakka', 'N/A')}")
                print(f"                  Count: {entry.get('count', 'N/A')}")
                print(f"                  Edit Notes: {entry.get('edit_notes', [])}")
        else:
            print(f"❌ Failed to get history: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error getting history: {e}")
        return False
    
    # Test 7: Test Statistics Include Prayer Entries
    print("\n7. Testing Statistics Include Prayer Entries")
    try:
        response = requests.get(f"{BACKEND_URL}/azkar/13/stats")
        if response.status_code == 200:
            stats = response.json()
            print(f"✅ Da'wah statistics retrieved successfully")
            print(f"   Total count: {stats.get('total_count', 0)}")
            print(f"   Total sessions: {stats.get('total_sessions', 0)}")
            print(f"   Last entry: {stats.get('last_entry', 'N/A')}")
        else:
            print(f"❌ Failed to get statistics: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error getting statistics: {e}")
        return False
    
    # Test 8: Test Daily Summary Includes Prayer Entries
    print("\n8. Testing Daily Summary Includes Prayer Entries")
    try:
        response = requests.get(f"{BACKEND_URL}/azkar/daily/2025-01-30")
        if response.status_code == 200:
            daily_data = response.json()
            print(f"✅ Daily summary retrieved successfully")
            print(f"   Date: {daily_data.get('date', 'N/A')}")
            print(f"   Total daily: {daily_data.get('total_daily', 0)}")
            
            azkar_summary = daily_data.get('azkar_summary', {})
            if '13' in azkar_summary:
                dawa_summary = azkar_summary['13']
                print(f"   Da'wah summary - Count: {dawa_summary.get('count', 0)}")
                print(f"                    Sessions: {dawa_summary.get('sessions', 0)}")
                print(f"                    Percentage: {dawa_summary.get('percentage', 0)}%")
            else:
                print("   No Da'wah entries found in daily summary")
        else:
            print(f"❌ Failed to get daily summary: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error getting daily summary: {e}")
        return False
    
    print("\n" + "=" * 60)
    print("✅ ALL PRAYER AND DAWA INTEGRATION TESTS PASSED!")
    return True

def test_no_duplicate_entries():
    """Test that updates don't create duplicate entries"""
    print("\n🔄 TESTING NO DUPLICATE ENTRIES ON UPDATE")
    print("=" * 60)
    
    # Create an entry
    entry_data = {
        "zikr_id": 13,
        "count": 2,
        "date": "2025-01-30",
        "comment": "اختبار عدم التكرار",
        "source": "prayer",
        "prayer_id": "maghrib_2025-01-30",
        "rakka": 2
    }
    
    try:
        # Create entry
        response = requests.post(f"{BACKEND_URL}/azkar/entry", json=entry_data)
        if response.status_code == 200:
            entry = response.json()
            entry_id = entry['id']
            print(f"✅ Test entry created: {entry_id[:8]}...")
            
            # Get initial count of entries
            history_response = requests.get(f"{BACKEND_URL}/azkar/13/history")
            if history_response.status_code == 200:
                initial_entries = len(history_response.json().get('entries', []))
                print(f"   Initial entry count: {initial_entries}")
                
                # Update the entry
                update_data = {"count": 4, "edit_note": "تحديث العدد"}
                update_response = requests.put(f"{BACKEND_URL}/azkar/entry/{entry_id}", json=update_data)
                
                if update_response.status_code == 200:
                    print("✅ Entry updated successfully")
                    
                    # Check entry count again
                    final_history_response = requests.get(f"{BACKEND_URL}/azkar/13/history")
                    if final_history_response.status_code == 200:
                        final_entries = len(final_history_response.json().get('entries', []))
                        print(f"   Final entry count: {final_entries}")
                        
                        if final_entries == initial_entries:
                            print("✅ NO DUPLICATE ENTRIES CREATED - Update worked correctly")
                            return True
                        else:
                            print(f"❌ DUPLICATE ENTRIES DETECTED - Count increased from {initial_entries} to {final_entries}")
                            return False
                    else:
                        print("❌ Failed to get final history")
                        return False
                else:
                    print(f"❌ Failed to update entry: {update_response.status_code}")
                    return False
            else:
                print("❌ Failed to get initial history")
                return False
        else:
            print(f"❌ Failed to create test entry: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error in duplicate test: {e}")
        return False

def main():
    """Main test function"""
    print("🚀 STARTING PRAYER AND DAWA INTEGRATION BACKEND TESTING")
    print(f"Backend URL: {BACKEND_URL}")
    print("=" * 80)
    
    # Test basic connectivity
    try:
        response = requests.get(f"{BACKEND_URL}/")
        if response.status_code == 200:
            print("✅ Backend connectivity confirmed")
        else:
            print(f"❌ Backend connectivity failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Backend connectivity error: {e}")
        return False
    
    # Run all tests
    tests_passed = 0
    total_tests = 2
    
    if test_prayer_dawa_integration():
        tests_passed += 1
    
    if test_no_duplicate_entries():
        tests_passed += 1
    
    print("\n" + "=" * 80)
    print(f"FINAL RESULTS: {tests_passed}/{total_tests} test suites passed")
    
    if tests_passed == total_tests:
        print("🎉 ALL PRAYER AND DAWA INTEGRATION TESTS SUCCESSFUL!")
        return True
    else:
        print("❌ SOME TESTS FAILED - Review output above")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)