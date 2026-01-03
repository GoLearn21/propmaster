#!/usr/bin/env python3
"""
Test script to verify PropMaster Task Management System
Tests both frontend build and backend API functionality
"""

import requests
import json
import sys

print("=" * 60)
print("PropMaster Task Management System - Verification Tests")
print("=" * 60)
print()

# Configuration
FRONTEND_URL = "https://7qz08gud84b6.space.minimax.io"
SUPABASE_URL = "https://rautdxfkuemmlhcrujxq.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhdXRkeGZrdWVtbWxoY3J1anhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NDYyMDUsImV4cCI6MjA3NzMyMjIwNX0.8-cYRr4C4eeXMfaT3ikEjOuWOTK4yHvcCrbePfJSDcs"

results = {"passed": 0, "failed": 0, "tests": []}

def test_result(name, passed, message=""):
    """Record test result"""
    status = "✓ PASS" if passed else "✗ FAIL"
    results["tests"].append({"name": name, "passed": passed, "message": message})
    if passed:
        results["passed"] += 1
    else:
        results["failed"] += 1
    print(f"{status}: {name}")
    if message:
        print(f"        {message}")

print("TEST SUITE 1: Frontend Deployment")
print("-" * 60)

# Test 1: Website accessibility
try:
    response = requests.get(FRONTEND_URL, timeout=10)
    test_result("Website is accessible", response.status_code == 200, 
                f"HTTP {response.status_code}")
except Exception as e:
    test_result("Website is accessible", False, str(e))

# Test 2: Tasks page route
try:
    response = requests.get(f"{FRONTEND_URL}/tasks-maintenance", timeout=10)
    test_result("Tasks page route exists", response.status_code == 200,
                f"HTTP {response.status_code}")
except Exception as e:
    test_result("Tasks page route exists", False, str(e))

# Test 3: Index.html contains React app
try:
    response = requests.get(f"{FRONTEND_URL}/index.html", timeout=10)
    html_content = response.text
    has_root = 'id="root"' in html_content
    has_js = '.js' in html_content
    test_result("React app structure present", has_root and has_js,
                f"Root div: {has_root}, JS bundle: {has_js}")
except Exception as e:
    test_result("React app structure present", False, str(e))

print()
print("TEST SUITE 2: Backend API Endpoints")
print("-" * 60)

# Test 4: Get mention data (for property dropdowns)
try:
    response = requests.post(
        f"{SUPABASE_URL}/functions/v1/get-mention-data",
        headers={"Content-Type": "application/json"},
        json={},
        timeout=10
    )
    if response.status_code == 200:
        data = response.json()
        if "data" in data:
            properties_count = len(data["data"].get("properties", []))
            units_count = len(data["data"].get("units", []))
            tenants_count = len(data["data"].get("tenants", []))
            test_result("get-mention-data endpoint", True,
                       f"{properties_count} properties, {units_count} units, {tenants_count} tenants")
        else:
            test_result("get-mention-data endpoint", False, "Unexpected response format")
    else:
        test_result("get-mention-data endpoint", False, f"HTTP {response.status_code}")
except Exception as e:
    test_result("get-mention-data endpoint", False, str(e))

# Test 5: Fetch tasks from database
try:
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/tasks",
        headers={
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": f"Bearer {SUPABASE_ANON_KEY}"
        },
        params={"select": "*", "limit": 10},
        timeout=10
    )
    if response.status_code == 200:
        tasks = response.json()
        test_result("Fetch tasks from database", True,
                   f"Retrieved {len(tasks)} tasks")
    else:
        test_result("Fetch tasks from database", False, f"HTTP {response.status_code}")
except Exception as e:
    test_result("Fetch tasks from database", False, str(e))

# Test 6: Create a test task
try:
    test_task = {
        "title": "Automated Test Task",
        "description": "Created by automated testing script",
        "task_type": "General",
        "priority": "medium",
        "status": "pending"
    }
    response = requests.post(
        f"{SUPABASE_URL}/functions/v1/create-task",
        headers={"Content-Type": "application/json"},
        json=test_task,
        timeout=10
    )
    if response.status_code == 200:
        data = response.json()
        if "data" in data and "tasks" in data["data"]:
            created_task = data["data"]["tasks"][0]
            test_result("Create task via API", True,
                       f"Task ID: {created_task['id']}")
        else:
            test_result("Create task via API", False, "Task not created")
    else:
        test_result("Create task via API", False, f"HTTP {response.status_code}")
except Exception as e:
    test_result("Create task via API", False, str(e))

# Test 7: Fetch properties for linking
try:
    response = requests.get(
        f"{SUPABASE_URL}/rest/v1/properties",
        headers={
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": f"Bearer {SUPABASE_ANON_KEY}"
        },
        params={"select": "*", "limit": 10},
        timeout=10
    )
    if response.status_code == 200:
        properties = response.json()
        test_result("Fetch properties for linking", True,
                   f"Retrieved {len(properties)} properties")
    else:
        test_result("Fetch properties for linking", False, f"HTTP {response.status_code}")
except Exception as e:
    test_result("Fetch properties for linking", False, str(e))

print()
print("=" * 60)
print("TEST RESULTS SUMMARY")
print("=" * 60)
print(f"Total Tests: {results['passed'] + results['failed']}")
print(f"Passed: {results['passed']}")
print(f"Failed: {results['failed']}")
print()

if results['failed'] > 0:
    print("FAILED TESTS:")
    for test in results["tests"]:
        if not test["passed"]:
            print(f"  - {test['name']}: {test['message']}")
    sys.exit(1)
else:
    print("✓ ALL TESTS PASSED")
    print()
    print("System Status: OPERATIONAL")
    print("The Task Management System is fully functional.")
    sys.exit(0)
