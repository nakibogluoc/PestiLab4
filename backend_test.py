#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
import os

class PestiLabAPITester:
    def __init__(self, base_url="https://labelpro-app.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.user_data = None
        self.compound_id = None
        self.usage_id = None
        self.label_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if files:
                # Remove Content-Type for file uploads
                headers.pop('Content-Type', None)
                
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    response = requests.post(url, files=files, headers=headers)
                else:
                    response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json() if response.content else {}
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_login(self):
        """Test login with admin credentials"""
        print("\n" + "="*50)
        print("TESTING AUTHENTICATION")
        print("="*50)
        
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"username": "admin", "password": "admin123"}
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_data = response.get('user', {})
            print(f"   Token received: {self.token[:20]}...")
            print(f"   User: {self.user_data.get('username')} ({self.user_data.get('role')})")
            return True
        return False

    def test_get_me(self):
        """Test get current user"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        return success

    def test_dashboard(self):
        """Test dashboard endpoint"""
        print("\n" + "="*50)
        print("TESTING DASHBOARD")
        print("="*50)
        
        success, response = self.run_test(
            "Dashboard Data",
            "GET",
            "dashboard",
            200
        )
        if success:
            print(f"   Total Compounds: {response.get('total_compounds', 0)}")
            print(f"   Total Usages: {response.get('total_usages', 0)}")
            print(f"   Total Labels: {response.get('total_labels', 0)}")
            print(f"   Critical Stocks: {len(response.get('critical_stocks', []))}")
        return success

    def test_compounds_crud(self):
        """Test compound CRUD operations"""
        print("\n" + "="*50)
        print("TESTING COMPOUNDS CRUD")
        print("="*50)
        
        # Create compound
        compound_data = {
            "name": "Test Imidacloprid",
            "cas_number": "138261-41-3",
            "solvent": "Acetone",
            "stock_value": 1000.0,
            "stock_unit": "mg",
            "critical_value": 100.0,
            "critical_unit": "mg"
        }
        
        success, response = self.run_test(
            "Create Compound",
            "POST",
            "compounds",
            200,
            data=compound_data
        )
        
        if success and 'id' in response:
            self.compound_id = response['id']
            print(f"   Created compound ID: {self.compound_id}")
        else:
            return False

        # Get all compounds
        success, response = self.run_test(
            "Get All Compounds",
            "GET",
            "compounds",
            200
        )
        
        if not success:
            return False

        # Get specific compound
        success, response = self.run_test(
            "Get Specific Compound",
            "GET",
            f"compounds/{self.compound_id}",
            200
        )
        
        if not success:
            return False

        # Update compound
        update_data = {
            "stock_value": 800.0,
            "critical_value": 80.0
        }
        
        success, response = self.run_test(
            "Update Compound",
            "PUT",
            f"compounds/{self.compound_id}",
            200,
            data=update_data
        )
        
        return success

    def test_weighing_calculation(self):
        """Test weighing and calculation"""
        print("\n" + "="*50)
        print("TESTING WEIGHING & CALCULATION")
        print("="*50)
        
        if not self.compound_id:
            print("❌ No compound ID available for weighing test")
            return False

        weighing_data = {
            "compound_id": self.compound_id,
            "weighed_amount": 12.5,
            "weighed_unit": "mg",
            "prepared_volume": 10.0,
            "volume_unit": "mL",
            "solvent": "Acetone"
        }
        
        success, response = self.run_test(
            "Create Weighing Record",
            "POST",
            "weighing",
            200,
            data=weighing_data
        )
        
        if success:
            usage = response.get('usage', {})
            label = response.get('label', {})
            self.usage_id = usage.get('id')
            self.label_id = label.get('id')
            
            print(f"   Concentration: {usage.get('concentration')} {usage.get('concentration_unit')}")
            print(f"   Label Code: {label.get('label_code')}")
            print(f"   Remaining Stock: {usage.get('remaining_stock')} {usage.get('remaining_stock_unit')}")
            print(f"   QR Code Generated: {'Yes' if response.get('qr_code') else 'No'}")
            print(f"   Barcode Generated: {'Yes' if response.get('barcode') else 'No'}")
        
        return success

    def test_usages_and_labels(self):
        """Test usage and label retrieval"""
        print("\n" + "="*50)
        print("TESTING USAGES & LABELS")
        print("="*50)
        
        # Get all usages
        success, response = self.run_test(
            "Get All Usages",
            "GET",
            "usages",
            200
        )
        
        if not success:
            return False

        # Get usages for specific compound
        if self.compound_id:
            success, response = self.run_test(
                "Get Compound Usages",
                "GET",
                f"usages?compound_id={self.compound_id}",
                200
            )
            
            if not success:
                return False

        # Get all labels
        success, response = self.run_test(
            "Get All Labels",
            "GET",
            "labels",
            200
        )
        
        if not success:
            return False

        # Get specific label with codes
        if self.label_id:
            success, response = self.run_test(
                "Get Label with Codes",
                "GET",
                f"labels/{self.label_id}",
                200
            )
            
            if success:
                print(f"   QR Code: {'Present' if response.get('qr_code') else 'Missing'}")
                print(f"   Barcode: {'Present' if response.get('barcode') else 'Missing'}")
        
        return success

    def test_search(self):
        """Test search functionality"""
        print("\n" + "="*50)
        print("TESTING SEARCH")
        print("="*50)
        
        # Search by compound name
        success, response = self.run_test(
            "Search by Name",
            "GET",
            "search?q=Imidacloprid",
            200
        )
        
        if success:
            compounds = response.get('compounds', [])
            usages = response.get('usages', [])
            print(f"   Found {len(compounds)} compounds, {len(usages)} usages")
        
        return success

    def test_excel_import(self):
        """Test Excel import functionality"""
        print("\n" + "="*50)
        print("TESTING EXCEL IMPORT")
        print("="*50)
        
        # Download the Excel file first
        excel_url = "https://customer-assets.emergentagent.com/job_988a077c-f1b3-498f-a1ba-2571c0d7b2a2/artifacts/9nh52iaz_Pestisit_Stok_Hesaplayici_v30-07102025.xlsx"
        
        try:
            print(f"   Downloading Excel file from: {excel_url}")
            excel_response = requests.get(excel_url)
            if excel_response.status_code != 200:
                print(f"❌ Failed to download Excel file: {excel_response.status_code}")
                return False
            
            # Save temporarily
            with open('/tmp/test_excel.xlsx', 'wb') as f:
                f.write(excel_response.content)
            
            # Test import
            with open('/tmp/test_excel.xlsx', 'rb') as f:
                files = {'file': ('test_excel.xlsx', f, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
                success, response = self.run_test(
                    "Excel Import",
                    "POST",
                    "compounds/import",
                    200,
                    files=files
                )
            
            if success:
                print(f"   Compounds Added: {response.get('compounds_added', 0)}")
                print(f"   Compounds Updated: {response.get('compounds_updated', 0)}")
                print(f"   Compounds Skipped: {response.get('compounds_skipped', 0)}")
            
            # Clean up
            os.remove('/tmp/test_excel.xlsx')
            return success
            
        except Exception as e:
            print(f"❌ Excel import test failed: {str(e)}")
            return False

    def test_user_management(self):
        """Test user management (admin only)"""
        print("\n" + "="*50)
        print("TESTING USER MANAGEMENT")
        print("="*50)
        
        # Get all users
        success, response = self.run_test(
            "Get All Users",
            "GET",
            "users",
            200
        )
        
        if success:
            users = response if isinstance(response, list) else []
            print(f"   Found {len(users)} users")
        
        return success

    def cleanup(self):
        """Clean up test data"""
        print("\n" + "="*50)
        print("CLEANUP")
        print("="*50)
        
        # Delete test compound (admin only)
        if self.compound_id and self.user_data.get('role') == 'admin':
            success, response = self.run_test(
                "Delete Test Compound",
                "DELETE",
                f"compounds/{self.compound_id}",
                200
            )
            if success:
                print("   Test compound deleted successfully")

    def run_all_tests(self):
        """Run all tests"""
        print("🧪 Starting PestiLab API Tests")
        print(f"🌐 Base URL: {self.base_url}")
        print("="*70)

        # Authentication tests
        if not self.test_login():
            print("❌ Login failed, stopping tests")
            return False

        self.test_get_me()

        # Core functionality tests
        self.test_dashboard()
        self.test_compounds_crud()
        self.test_weighing_calculation()
        self.test_usages_and_labels()
        self.test_search()
        self.test_user_management()
        
        # Excel import test (may fail if file not accessible)
        try:
            self.test_excel_import()
        except Exception as e:
            print(f"⚠️  Excel import test skipped: {str(e)}")

        # Cleanup
        self.cleanup()

        # Print results
        print("\n" + "="*70)
        print("📊 TEST RESULTS")
        print("="*70)
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    tester = PestiLabAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())