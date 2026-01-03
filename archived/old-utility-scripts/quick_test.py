#!/usr/bin/env python3
"""Quick API test for PropMaster backend"""
import requests

print("Testing PropMaster Backend APIs\n")

# Test 1: Get mention data
print("1. Testing get-mention-data...")
try:
    r = requests.post(
        "https://rautdxfkuemmlhcrujxq.supabase.co/functions/v1/get-mention-data",
        json={},
        timeout=15
    )
    print(f"   Status: {r.status_code}")
    if r.status_code == 200:
        data = r.json()
        props = len(data.get("data", {}).get("properties", []))
        units = len(data.get("data", {}).get("units", []))
        tenants = len(data.get("data", {}).get("tenants", []))
        print(f"   Properties: {props}, Units: {units}, Tenants: {tenants}")
except Exception as e:
    print(f"   Error: {e}")

# Test 2: Fetch tasks
print("\n2. Testing tasks database...")
try:
    r = requests.get(
        "https://rautdxfkuemmlhcrujxq.supabase.co/rest/v1/tasks",
        headers={
            "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhdXRkeGZrdWVtbWxoY3J1anhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NDYyMDUsImV4cCI6MjA3NzMyMjIwNX0.8-cYRr4C4eeXMfaT3ikEjOuWOTK4yHvcCrbePfJSDcs",
            "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhdXRkeGZrdWVtbWxoY3J1anhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3NDYyMDUsImV4cCI6MjA3NzMyMjIwNX0.8-cYRr4C4eeXMfaT3ikEjOuWOTK4yHvcCrbePfJSDcs"
        },
        params={"select": "*", "limit": 10},
        timeout=15
    )
    print(f"   Status: {r.status_code}")
    if r.status_code == 200:
        tasks = r.json()
        print(f"   Tasks found: {len(tasks)}")
        if tasks:
            print(f"   Sample task: {tasks[0].get('title', 'N/A')}")
except Exception as e:
    print(f"   Error: {e}")

# Test 3: Create task
print("\n3. Testing task creation...")
try:
    r = requests.post(
        "https://rautdxfkuemmlhcrujxq.supabase.co/functions/v1/create-task",
        json={
            "title": "Automated Test - Pool Maintenance",
            "description": "Test task created by automated testing",
            "task_type": "Cleaning",
            "priority": "medium",
            "status": "pending"
        },
        timeout=15
    )
    print(f"   Status: {r.status_code}")
    if r.status_code == 200:
        data = r.json()
        if "data" in data and "tasks" in data["data"]:
            task = data["data"]["tasks"][0]
            print(f"   Created: {task.get('title', 'N/A')}")
            print(f"   Task ID: {task.get('id', 'N/A')[:8]}...")
except Exception as e:
    print(f"   Error: {e}")

print("\n✓ Backend API testing complete")
