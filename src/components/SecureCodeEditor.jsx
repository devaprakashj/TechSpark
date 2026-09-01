import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Maximize, Play, Save, AlertOctagon, Terminal, User, Hash, GraduationCap, Calendar, Clock, CheckCircle2, XCircle, Lock, Code2, Layers } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';

/**
 * Gets the LeetCode code snippet for the given language.
 * Falls back to a clean generic template if not found.
 */
const getDefaultCodeSnippet = (lang, challenge) => {
    if (challenge?.codeSnippets && Array.isArray(challenge.codeSnippets)) {
        const langMap = {
            python: ['python3', 'python'],
            javascript: ['javascript', 'js'],
            cpp: ['cpp', 'c++'],
            java: ['java']
        };
        const targets = langMap[lang] || [lang];
        const found = challenge.codeSnippets.find(s => targets.includes((s.langSlug || s.lang || '').toLowerCase()));
        if (found && found.code) {
            let snippet = found.code;
            if (lang === 'python') {
                const trimmed = snippet.trimEnd();
                if (trimmed.endsWith(':')) {
                    snippet = trimmed + '\n        # Write your solution here\n        pass\n';
                }
            }
            return snippet;
        }
    }

    // Fallback generic templates
    switch (lang) {
        case 'python':
            return `class Solution:\n    def solve(self, nums: List[int], target: int) -> int:\n        # Write your solution here\n        pass\n`;
        case 'javascript':
            return `/**\n * @param {number[]} nums\n * @param {number} target\n * @return {number[]}\n */\nvar solve = function(nums, target) {\n    // Write your solution here\n};\n`;
        case 'cpp':
            return `class Solution {\npublic:\n    int solve(vector<int>& nums, int target) {\n        // Write your solution here\n        return 0;\n    }\n};\n`;
        case 'java':
            return `class Solution {\n    public int[] solve(int[] nums, int target) {\n        // Write your solution here\n        return new int[]{};\n    }\n}\n`;
        default:
            return `// Write your solution here\n`;
    }
};

/**
 * Extracts the method name from a LeetCode-style code snippet.
 * Looks for the first public method in the class body.
 */
const extractMethodInfo = (code, lang) => {
    let methodName = null;
    let paramCount = 0;

    if (lang === 'python') {
        const codeWithoutComments = code.split('\n').filter(line => !line.trim().startsWith('#')).join('\n');
        const match = codeWithoutComments.match(/def\s+([a-zA-Z0-9_]+)\s*\(\s*self/);
        if (match && match[1] !== '__init__') {
            methodName = match[1];
        }
    } else if (lang === 'javascript') {
        const codeWithoutComments = code.split('\n').filter(line => !line.trim().startsWith('//')).join('\n');
        const m1 = codeWithoutComments.match(/var\s+([a-zA-Z0-9_]+)\s*=\s*function/);
        const m2 = codeWithoutComments.match(/function\s+([a-zA-Z0-9_]+)\s*\(/);
        const m3 = codeWithoutComments.match(/([a-zA-Z0-9_]+)\s*\([^)]*\)\s*\{/);
        const match = m1 || m2 || m3;
        if (match && match[1] !== 'Solution' && match[1] !== 'TreeNode' && match[1] !== 'ListNode') {
            methodName = match[1];
        }
    } else if (lang === 'cpp') {
        const codeWithoutComments = code.split('\n').filter(line => !line.trim().startsWith('//')).join('\n');
        const match = codeWithoutComments.match(/(?:bool|int|double|float|long|void|string|char|TreeNode\*|ListNode\*|vector<[\w\s,<>]+>)\s+([a-zA-Z0-9_]+)\s*\(/);
        if (match) {
            methodName = match[1];
        }
    } else if (lang === 'java') {
        const codeWithoutComments = code.split('\n').filter(line => !line.trim().startsWith('//')).join('\n');
        const match = codeWithoutComments.match(/public\s+[\w<>\[\], ?]+\s+([a-zA-Z0-9_]+)\s*\(/);
        if (match) {
            methodName = match[1];
        }
    }

    return { methodName, paramCount };
};

/**
 * Wraps user's LeetCode-style code with a driver that:
 * 1. Reads each line of stdin as a JSON argument
 * 2. Calls the Solution method with those args
 * 3. Prints the result as JSON
 * This matches LeetCode's actual execution model.
 */
const wrapSourceCode = (code, lang) => {
    const { methodName, paramCount } = extractMethodInfo(code, lang);

    if (lang === 'python') {
        if (code.includes('class Solution') && !code.includes('sys.stdin') && !code.includes('input(')) {
            const detectedMethod = methodName || '';
            const preamble = `import sys
import json
from typing import Optional, List, Tuple, Set, Dict

class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def _list_to_linkedlist(lst):
    if not lst: return None
    head = ListNode(lst[0])
    cur = head
    for v in lst[1:]:
        cur.next = ListNode(v)
        cur = cur.next
    return head

def _linkedlist_to_list(node):
    result = []
    while node:
        result.append(node.val)
        node = node.next
    return result

def _list_to_tree(lst):
    if not lst or lst[0] is None:
        return None
    root = TreeNode(lst[0])
    queue = [root]
    i = 1
    while queue and i < len(lst):
        node = queue.pop(0)
        if node is not None:
            if i < len(lst):
                if lst[i] is not None:
                    node.left = TreeNode(lst[i])
                    queue.append(node.left)
                else:
                    queue.append(None)
                i += 1
            if i < len(lst):
                if lst[i] is not None:
                    node.right = TreeNode(lst[i])
                    queue.append(node.right)
                else:
                    queue.append(None)
                i += 1
    return root

def _tree_to_list(root):
    if not root:
        return []
    result = []
    queue = [root]
    while queue:
        node = queue.pop(0)
        if node is not None:
            result.append(node.val)
            queue.append(node.left)
            queue.append(node.right)
        else:
            result.append(None)
    while result and result[-1] is None:
        result.pop()
    return result

def _parse_arg(s):
    s = s.strip()
    # Normalize true/false/null
    if s.lower() == 'true': return True
    if s.lower() == 'false': return False
    if s.lower() == 'null' or s.lower() == 'none': return None
    try:
        # If wrapped in root = [...] or nums = [...]
        if '=' in s:
            s = s.split('=', 1)[1].strip()
        # Replace unquoted null with None for Python literal eval if needed
        return json.loads(s)
    except Exception:
        try:
            return eval(s)
        except Exception:
            return s

`;

            const driverCode = `

if __name__ == '__main__':
    try:
        raw = sys.stdin.read()
        lines = [l for l in raw.split('\\n') if l.strip()]
        sol = Solution()
        import inspect
        methods = [m for m in dir(sol) if not m.startswith('_') and callable(getattr(sol, m))]
        method_name = '${detectedMethod}' if '${detectedMethod}' else (methods[0] if methods else None)
        if method_name and hasattr(sol, method_name):
            method = getattr(sol, method_name)
            sig = inspect.signature(method)
            param_names = list(sig.parameters.keys())
            param_count = len(param_names)
            parsed = [_parse_arg(l) for l in lines[:max(param_count, 1)]]
            type_hints = str(sig)
            converted = []
            for idx, arg in enumerate(parsed):
                p_name = param_names[idx] if idx < len(param_names) else ''
                p_hint = type_hints
                if isinstance(arg, list):
                    if 'TreeNode' in p_hint or 'root' in p_name.lower() or 'tree' in p_name.lower():
                        converted.append(_list_to_tree(arg))
                    elif 'ListNode' in p_hint or 'head' in p_name.lower() or 'node' in p_name.lower() or 'list' in p_name.lower():
                        converted.append(_list_to_linkedlist(arg))
                    else:
                        converted.append(arg)
                else:
                    converted.append(arg)

            if param_count == 0:
                result = method()
            elif param_count == 1:
                result = method(converted[0] if converted else None)
            else:
                result = method(*converted[:param_count])

            if result is not None:
                if isinstance(result, TreeNode) or hasattr(result, 'left') or hasattr(result, 'right'):
                    result = _tree_to_list(result)
                elif isinstance(result, ListNode) or hasattr(result, 'next'):
                    result = _linkedlist_to_list(result)
                
                if isinstance(result, (list, dict)):
                    print(json.dumps(result, separators=(',', ':')))
                elif isinstance(result, bool):
                    print('true' if result else 'false')
                else:
                    print(result)
            else:
                if 'bool' in str(sig.return_annotation).lower():
                    print('false')
                elif 'TreeNode' in str(sig.return_annotation) or 'ListNode' in str(sig.return_annotation):
                    print('[]')
                else:
                    print('null')
    except Exception as e:
        sys.stderr.write('Runtime Error: ' + str(e) + '\\n')
`;
            return preamble + code + driverCode;
        }
    } else if (lang === 'javascript') {
        if ((code.includes('var ') || code.includes('function ') || code.includes('class Solution')) && !code.includes('require(') && !code.includes('readFileSync')) {
            const fnName = methodName || 'solve';
            const preamble = `
function ListNode(val, next) {
    this.val = (val === undefined ? 0 : val);
    this.next = (next === undefined ? null : next);
}

function TreeNode(val, left, right) {
    this.val = (val === undefined ? 0 : val);
    this.left = (left === undefined ? null : left);
    this.right = (right === undefined ? null : right);
}

function _listToTree(arr) {
    if (!arr || !arr.length || arr[0] === null || arr[0] === undefined) return null;
    const root = new TreeNode(arr[0]);
    const queue = [root];
    let i = 1;
    while (queue.length > 0 && i < arr.length) {
        const curr = queue.shift();
        if (curr !== null) {
            if (i < arr.length) {
                if (arr[i] !== null && arr[i] !== undefined) {
                    curr.left = new TreeNode(arr[i]);
                    queue.push(curr.left);
                } else {
                    queue.push(null);
                }
                i++;
            }
            if (i < arr.length) {
                if (arr[i] !== null && arr[i] !== undefined) {
                    curr.right = new TreeNode(arr[i]);
                    queue.push(curr.right);
                } else {
                    queue.push(null);
                }
                i++;
            }
        }
    }
    return root;
}

function _treeToList(root) {
    if (!root) return [];
    const result = [];
    const queue = [root];
    while (queue.length > 0) {
        const node = queue.shift();
        if (node) {
            result.push(node.val);
            queue.push(node.left);
            queue.push(node.right);
        } else {
            result.push(null);
        }
    }
    while (result.length > 0 && result[result.length - 1] === null) {
        result.pop();
    }
    return result;
}

function _listToLinkedList(arr) {
    if (!arr || !arr.length) return null;
    const head = new ListNode(arr[0]);
    let curr = head;
    for (let i = 1; i < arr.length; i++) {
        curr.next = new ListNode(arr[i]);
        curr = curr.next;
    }
    return head;
}

function _linkedListToList(head) {
    const res = [];
    let curr = head;
    while (curr) {
        res.push(curr.val);
        curr = curr.next;
    }
    return res;
}
`;

            const driverCode = `

const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin });
const lines = [];
rl.on('line', (line) => lines.push(line.trim()));
rl.on('close', () => {
    try {
        function parseArg(s) {
            if (!s) return null;
            if (s.includes('=')) s = s.split('=')[1].trim();
            try { return JSON.parse(s); } catch(e) { return s; }
        }
        const parsed = lines.filter(Boolean).map(parseArg);
        let sol = typeof Solution !== 'undefined' ? new Solution() : null;
        let fn = sol && typeof sol['${fnName}'] === 'function' ? sol['${fnName}'].bind(sol) : (typeof ${fnName} === 'function' ? ${fnName} : null);
        if (!fn && sol) {
            const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(sol)).filter(m => m !== 'constructor');
            if (methods.length > 0) fn = sol[methods[0]].bind(sol);
        }
        if (!fn) throw new Error('Function not found');

        const fnStr = fn.toString();
        const converted = parsed.map(arg => {
            if (Array.isArray(arg)) {
                if (fnStr.includes('root') || fnStr.includes('tree') || fnStr.includes('TreeNode')) {
                    return _listToTree(arg);
                } else if (fnStr.includes('head') || fnStr.includes('ListNode')) {
                    return _listToLinkedList(arg);
                }
            }
            return arg;
        });

        const result = converted.length === 1 ? fn(converted[0]) : fn(...converted);
        if (result !== undefined) {
            if (result instanceof TreeNode || (result && (result.left !== undefined || result.right !== undefined))) {
                console.log(JSON.stringify(_treeToList(result)));
            } else if (result instanceof ListNode || (result && result.next !== undefined)) {
                console.log(JSON.stringify(_linkedListToList(result)));
            } else if (typeof result === 'object') {
                console.log(JSON.stringify(result));
            } else {
                console.log(result);
            }
        }
    } catch(e) {
        process.stderr.write('Runtime Error: ' + e.message + '\\n');
    }
});
`;
            return preamble + code + driverCode;
        }
    } else if (lang === 'java') {
        if (code.includes('class Solution') && !code.includes('public static void main')) {
            const preamble = `import java.util.*;
import java.io.*;
import java.lang.reflect.*;

class ListNode {
    public int val;
    public ListNode next;
    public ListNode() {}
    public ListNode(int val) { this.val = val; }
    public ListNode(int val, ListNode next) { this.val = val; this.next = next; }
}

class TreeNode {
    public int val;
    public TreeNode left;
    public TreeNode right;
    public TreeNode() {}
    public TreeNode(int val) { this.val = val; }
    public TreeNode(int val, TreeNode left, TreeNode right) {
        this.val = val;
        this.left = left;
        this.right = right;
    }
}

`;
            const javaDriver = `

public class Main {
    public static void main(String[] args) {
        try {
            Scanner sc = new Scanner(System.in);
            StringBuilder sb = new StringBuilder();
            while (sc.hasNextLine()) {
                sb.append(sc.nextLine()).append("\\n");
            }
            String raw = sb.toString().trim();

            Solution sol = new Solution();
            Method[] methods = Solution.class.getDeclaredMethods();
            Method target = null;
            for (Method m : methods) {
                if (!m.getName().contains("$") && Modifier.isPublic(m.getModifiers())) {
                    target = m;
                    break;
                }
            }
            if (target == null && methods.length > 0) {
                target = methods[0];
            }
            if (target != null) {
                target.setAccessible(true);
                Class<?>[] paramTypes = target.getParameterTypes();
                String[] lines = raw.isEmpty() ? new String[0] : raw.split("\\n");
                Object[] argsList = new Object[paramTypes.length];

                for (int i = 0; i < paramTypes.length; i++) {
                    String line = i < lines.length ? lines[i].trim() : "";
                    argsList[i] = parseArg(line, paramTypes[i]);
                }

                Object result = target.invoke(sol, argsList);
                if (result != null) {
                    if (result instanceof TreeNode) {
                        System.out.println(treeToString((TreeNode) result));
                    } else if (result instanceof ListNode) {
                        System.out.println(listToString((ListNode) result));
                    } else if (result instanceof int[]) {
                        System.out.println(Arrays.toString((int[]) result).replace(" ", ""));
                    } else if (result instanceof boolean[]) {
                        System.out.println(Arrays.toString((boolean[]) result).replace(" ", ""));
                    } else if (result instanceof Object[]) {
                        System.out.println(Arrays.deepToString((Object[]) result).replace(" ", ""));
                    } else if (result instanceof List) {
                        System.out.println(result.toString().replace(" ", ""));
                    } else {
                        System.out.println(result);
                    }
                } else {
                    if (target.getReturnType() == boolean.class || target.getReturnType() == Boolean.class) {
                        System.out.println("false");
                    } else if (target.getReturnType() == TreeNode.class || target.getReturnType() == ListNode.class) {
                        System.out.println("[]");
                    } else {
                        System.out.println("null");
                    }
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private static TreeNode buildTree(String s) {
        if (s == null || s.trim().isEmpty()) return null;
        s = s.trim();
        if (s.contains("=")) s = s.split("=", 2)[1].trim();
        s = s.replace("[", "").replace("]", "").replace(" ", "");
        if (s.isEmpty()) return null;
        String[] parts = s.split(",");
        if (parts[0].equalsIgnoreCase("null") || parts[0].isEmpty()) return null;

        TreeNode root = new TreeNode(Integer.parseInt(parts[0]));
        Queue<TreeNode> q = new LinkedList<>();
        q.add(root);
        int i = 1;

        while (!q.isEmpty() && i < parts.length) {
            TreeNode curr = q.poll();
            if (curr != null) {
                if (i < parts.length) {
                    if (!parts[i].equalsIgnoreCase("null") && !parts[i].isEmpty()) {
                        curr.left = new TreeNode(Integer.parseInt(parts[i]));
                        q.add(curr.left);
                    } else {
                        q.add(null);
                    }
                    i++;
                }
                if (i < parts.length) {
                    if (!parts[i].equalsIgnoreCase("null") && !parts[i].isEmpty()) {
                        curr.right = new TreeNode(Integer.parseInt(parts[i]));
                        q.add(curr.right);
                    } else {
                        q.add(null);
                    }
                    i++;
                }
            }
        }
        return root;
    }

    private static String treeToString(TreeNode root) {
        if (root == null) return "[]";
        List<String> res = new ArrayList<>();
        Queue<TreeNode> q = new LinkedList<>();
        q.add(root);
        while (!q.isEmpty()) {
            TreeNode node = q.poll();
            if (node != null) {
                res.add(String.valueOf(node.val));
                q.add(node.left);
                q.add(node.right);
            } else {
                res.add("null");
            }
        }
        while (res.size() > 0 && res.get(res.size() - 1).equals("null")) {
            res.remove(res.size() - 1);
        }
        return "[" + String.join(",", res) + "]";
    }

    private static ListNode buildList(String s) {
        if (s == null || s.trim().isEmpty()) return null;
        s = s.trim();
        if (s.contains("=")) s = s.split("=", 2)[1].trim();
        s = s.replace("[", "").replace("]", "").replace(" ", "");
        if (s.isEmpty()) return null;
        String[] parts = s.split(",");
        ListNode dummy = new ListNode(0);
        ListNode curr = dummy;
        for (String p : parts) {
            if (!p.trim().isEmpty()) {
                curr.next = new ListNode(Integer.parseInt(p.trim()));
                curr = curr.next;
            }
        }
        return dummy.next;
    }

    private static String listToString(ListNode head) {
        List<String> res = new ArrayList<>();
        ListNode curr = head;
        while (curr != null) {
            res.add(String.valueOf(curr.val));
            curr = curr.next;
        }
        return "[" + String.join(",", res) + "]";
    }

    private static Object parseArg(String s, Class<?> type) {
        if (s == null) return null;
        s = s.trim();
        if (s.contains("=")) s = s.split("=", 2)[1].trim();

        if (type == TreeNode.class) {
            return buildTree(s);
        } else if (type == ListNode.class) {
            return buildList(s);
        } else if (type == int[].class) {
            s = s.replace("[", "").replace("]", "").replace(" ", "");
            if (s.isEmpty()) return new int[0];
            String[] parts = s.split(",");
            int[] arr = new int[parts.length];
            for (int i = 0; i < parts.length; i++) arr[i] = Integer.parseInt(parts[i].trim());
            return arr;
        } else if (type == int[][].class) {
            s = s.trim();
            if (s.startsWith("[") && s.endsWith("]")) s = s.substring(1, s.length() - 1).trim();
            List<int[]> matrix = new ArrayList<>();
            int depth = 0;
            StringBuilder curRow = new StringBuilder();
            for (int k = 0; k < s.length(); k++) {
                char c = s.charAt(k);
                if (c == '[') { depth++; curRow.setLength(0); }
                else if (c == ']') {
                    depth--;
                    String rStr = curRow.toString().replace(" ", "").trim();
                    if (!rStr.isEmpty()) {
                        String[] items = rStr.split(",");
                        int[] rowArr = new int[items.length];
                        for (int j = 0; j < items.length; j++) rowArr[j] = Integer.parseInt(items[j].trim());
                        matrix.add(rowArr);
                    }
                } else if (depth > 0) {
                    curRow.append(c);
                }
            }
            return matrix.toArray(new int[0][]);
        } else if (type == String[].class) {
            s = s.replace("[", "").replace("]", "").replace(String.valueOf('"'), "").replace(" ", "");
            if (s.isEmpty()) return new String[0];
            return s.split(",");
        } else if (type == int.class || type == Integer.class) {
            return Integer.parseInt(s.replace(String.valueOf('"'), "").trim());
        } else if (type == boolean.class || type == Boolean.class) {
            return Boolean.parseBoolean(s.toLowerCase().trim());
        } else if (type == double.class || type == Double.class) {
            return Double.parseDouble(s.trim());
        } else if (type == long.class || type == Long.class) {
            return Long.parseLong(s.trim());
        } else if (type == String.class) {
            return s.replace(String.valueOf('"'), "").trim();
        } else if (type == char.class || type == Character.class) {
            s = s.replace(String.valueOf('"'), "").replace("'", "").trim();
            return s.isEmpty() ? ' ' : s.charAt(0);
        }
        return s;
    }
}
`;
            return preamble + code + javaDriver;
        }
    } else if (lang === 'cpp') {
        if (code.includes('class Solution') && !code.includes('int main(')) {
            const preamble = `#include <iostream>
#include <vector>
#include <string>
#include <sstream>
#include <algorithm>
#include <queue>
#include <stack>
#include <deque>
#include <map>
#include <set>
#include <unordered_map>
#include <unordered_set>
#include <cmath>
#include <climits>
using namespace std;

struct ListNode {
    int val;
    ListNode *next;
    ListNode() : val(0), next(nullptr) {}
    ListNode(int x) : val(x), next(nullptr) {}
    ListNode(int x, ListNode *next) : val(x), next(next) {}
};

struct TreeNode {
    int val;
    TreeNode *left;
    TreeNode *right;
    TreeNode() : val(0), left(nullptr), right(nullptr) {}
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
    TreeNode(int x, TreeNode *left, TreeNode *right) : val(x), left(left), right(right) {}
};

static TreeNode* buildTree(string s) {
    if (s.find('=') != string::npos) s = s.substr(s.find('=') + 1);
    string clean = "";
    for (char c : s) if (c != '[' && c != ']' && c != ' ') clean += c;
    if (clean.empty()) return nullptr;
    stringstream ss(clean);
    string item;
    vector<string> parts;
    while (getline(ss, item, ',')) parts.push_back(item);
    if (parts.empty() || parts[0] == "null" || parts[0].empty()) return nullptr;

    TreeNode* root = new TreeNode(stoi(parts[0]));
    queue<TreeNode*> q;
    q.push(root);
    size_t i = 1;

    while (!q.empty() && i < parts.size()) {
        TreeNode* curr = q.front();
        q.pop();
        if (curr) {
            if (i < parts.size()) {
                if (parts[i] != "null" && !parts[i].empty()) {
                    curr->left = new TreeNode(stoi(parts[i]));
                    q.push(curr->left);
                } else {
                    q.push(nullptr);
                }
                i++;
            }
            if (i < parts.size()) {
                if (parts[i] != "null" && !parts[i].empty()) {
                    curr->right = new TreeNode(stoi(parts[i]));
                    q.push(curr->right);
                } else {
                    q.push(nullptr);
                }
                i++;
            }
        }
    }
    return root;
}

static string treeToString(TreeNode* root) {
    if (!root) return "[]";
    vector<string> res;
    queue<TreeNode*> q;
    q.push(root);
    while (!q.empty()) {
        TreeNode* node = q.front();
        q.pop();
        if (node) {
            res.push_back(to_string(node->val));
            q.push(node->left);
            q.push(node->right);
        } else {
            res.push_back("null");
        }
    }
    while (!res.empty() && res.back() == "null") res.pop_back();
    string out = "[";
    for (size_t i = 0; i < res.size(); i++) {
        out += res[i] + (i + 1 < res.size() ? "," : "");
    }
    out += "]";
    return out;
}

static ListNode* buildList(string s) {
    if (s.find('=') != string::npos) s = s.substr(s.find('=') + 1);
    string clean = "";
    for (char c : s) if (c != '[' && c != ']' && c != ' ') clean += c;
    if (clean.empty()) return nullptr;
    stringstream ss(clean);
    string item;
    ListNode dummy(0);
    ListNode* curr = &dummy;
    while (getline(ss, item, ',')) {
        if (!item.empty()) {
            curr->next = new ListNode(stoi(item));
            curr = curr->next;
        }
    }
    return dummy.next;
}

static string listToString(ListNode* head) {
    string out = "[";
    ListNode* curr = head;
    while (curr) {
        out += to_string(curr->val) + (curr->next ? "," : "");
        curr = curr->next;
    }
    out += "]";
    return out;
}

static vector<int> parseVectorInt(string s) {
    if (s.find('=') != string::npos) s = s.substr(s.find('=') + 1);
    string clean = "";
    for (char c : s) if (c != '[' && c != ']' && c != ' ') clean += c;
    vector<int> res;
    if (clean.empty()) return res;
    stringstream ss(clean);
    string item;
    while (getline(ss, item, ',')) {
        if (!item.empty()) res.push_back(stoi(item));
    }
    return res;
}
`;

            // Detect parameter types from C++ method signature
            const cleanCode = code.split('\n').filter(l => !l.trim().startsWith('//')).join('\n');
            const sigMatch = cleanCode.match(/(?:bool|int|double|float|long|void|string|char|TreeNode\*|ListNode\*|vector<[\w\s,<>]+>)\s+([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\)/);
            
            const fn = sigMatch ? sigMatch[1] : (methodName || 'solve');
            const rawParams = sigMatch && sigMatch[2] ? sigMatch[2] : '';
            const isTreeParam = rawParams.includes('TreeNode');
            const isListParam = rawParams.includes('ListNode');
            const isMultiParam = rawParams.includes(',');

            let callerCode = '';
            if (isTreeParam) {
                callerCode = `
    string s = lines.empty() ? "" : lines[0];
    TreeNode* root = buildTree(s);
    auto res = sol.${fn}(root);
    if constexpr (is_same_v<decltype(res), bool>) {
        cout << (res ? "true" : "false") << "\\n";
    } else if constexpr (is_same_v<decltype(res), TreeNode*>) {
        cout << treeToString(res) << "\\n";
    } else if constexpr (is_same_v<decltype(res), int>) {
        cout << res << "\\n";
    } else {
        cout << res << "\\n";
    }
`;
            } else if (isListParam) {
                callerCode = `
    string s = lines.empty() ? "" : lines[0];
    ListNode* head = buildList(s);
    auto res = sol.${fn}(head);
    if constexpr (is_same_v<decltype(res), ListNode*>) {
        cout << listToString(res) << "\\n";
    } else if constexpr (is_same_v<decltype(res), bool>) {
        cout << (res ? "true" : "false") << "\\n";
    } else {
        cout << res << "\\n";
    }
`;
            } else if (isMultiParam) {
                callerCode = `
    auto arr = parseVectorInt(lines.size() > 0 ? lines[0] : "");
    int target = lines.size() > 1 ? stoi(lines[1]) : 0;
    auto res = sol.${fn}(arr, target);
    if constexpr (is_same_v<decltype(res), vector<int>>) {
        cout << "[";
        for (size_t i = 0; i < res.size(); i++) cout << res[i] << (i + 1 < res.size() ? "," : "");
        cout << "]\\n";
    } else if constexpr (is_same_v<decltype(res), bool>) {
        cout << (res ? "true" : "false") << "\\n";
    } else {
        cout << res << "\\n";
    }
`;
            } else {
                callerCode = `
    auto arr = parseVectorInt(lines.size() > 0 ? lines[0] : "");
    auto res = sol.${fn}(arr);
    if constexpr (is_same_v<decltype(res), vector<int>>) {
        cout << "[";
        for (size_t i = 0; i < res.size(); i++) cout << res[i] << (i + 1 < res.size() ? "," : "");
        cout << "]\\n";
    } else if constexpr (is_same_v<decltype(res), bool>) {
        cout << (res ? "true" : "false") << "\\n";
    } else if constexpr (is_same_v<decltype(res), int>) {
        cout << res << "\\n";
    } else {
        cout << res << "\\n";
    }
`;
            }

            const cppDriver = `

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    vector<string> lines;
    string line;
    while (getline(cin, line)) {
        while (!line.empty() && (line.back() == '\\r' || line.back() == ' ')) line.pop_back();
        if (!line.empty()) lines.push_back(line);
    }
    if (lines.empty()) return 0;

    Solution sol;
    ${callerCode}
    return 0;
}
`;
            return preamble + code + cppDriver;
        }
    }

    return code;
};

const SecureCodeEditor = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const challenge = location.state?.challenge || null;
    const { user } = useAuth();
    
    const studentUser = user || { uid: 'test_uid', fullName: 'Test Student', rollNumber: '000000', department: 'TEST' };

    const [language, setLanguage] = useState('python');
    const [code, setCode] = useState(() => getDefaultCodeSnippet('python', challenge));
    const [output, setOutput] = useState('');
    const [testResults, setTestResults] = useState([]);
    const [activeTerminalTab, setActiveTerminalTab] = useState('testcases'); // 'testcases' or 'console'
    const [isRunning, setIsRunning] = useState(false);
    const [isOutputMatched, setIsOutputMatched] = useState(false);
    
    // Security States
    const [warnings, setWarnings] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);
    const [hasStarted, setHasStarted] = useState(false);
    const [timeLeft, setTimeLeft] = useState((challenge?.timeLimit || 30) * 60);
    const [customAlert, setCustomAlert] = useState(null);
    
    const containerRef = useRef(null);
    const hasStartedRef = useRef(false);
    const isSubmittingRef = useRef(false);
    const lastWarningTimeRef = useRef(0);
    const warningsRef = useRef(0);
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const [cameraActive, setCameraActive] = useState(false);

    // Update default code when language changes
    const handleLanguageChange = (newLang) => {
        setLanguage(newLang);
        setCode(getDefaultCodeSnippet(newLang, challenge));
    };

    useEffect(() => {
        const startCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    setCameraActive(true);
                }
            } catch (err) {
                console.error("Camera access error:", err);
            }
        };
        startCamera();

        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    useEffect(() => {
        warningsRef.current = warnings;
    }, [warnings]);

    useEffect(() => {
        if (hasStarted && streamRef.current && videoRef.current && !videoRef.current.srcObject) {
            videoRef.current.srcObject = streamRef.current;
        }
    }, [hasStarted]);

    useEffect(() => {
        if (!hasStarted) return;
        
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    if (!isSubmittingRef.current) {
                        isSubmittingRef.current = true;
                        handleAutoSubmit(warningsRef.current, "Time is up!");
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [hasStarted]);

    useEffect(() => {
        if (!challenge) {
            navigate('/');
            return;
        }

        const handleFullscreenChange = () => {
            if (!document.fullscreenElement) {
                setIsFullscreen(false);
                if (hasStartedRef.current) {
                    triggerWarning("You exited fullscreen mode!");
                }
            } else {
                setIsFullscreen(true);
                setHasStarted(true);
                hasStartedRef.current = true;
            }
        };

        const forceExit = () => {
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(err => console.log(err));
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                if (hasStartedRef.current) {
                    triggerWarning("You switched to another tab or minimized the window!");
                    forceExit();
                }
            }
        };

        const handleKeyDown = (e) => {
            if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
                e.preventDefault();
            }
            if (e.key === 'PrintScreen' || (e.shiftKey && e.metaKey && e.key.toLowerCase() === 's')) {
                e.preventDefault();
                navigator.clipboard.writeText('');
                if (hasStartedRef.current) {
                    triggerWarning("Screenshots are disabled during the test!");
                }
            }
            if (e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'x' || e.key === 'C' || e.key === 'V' || e.key === 'X')) {
                e.preventDefault();
            }
        };

        const handleContextMenu = (e) => e.preventDefault();
        const handleCopyPaste = (e) => e.preventDefault();

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keyup', handleKeyDown);
        document.addEventListener('contextmenu', handleContextMenu);
        document.addEventListener('copy', handleCopyPaste);
        document.addEventListener('paste', handleCopyPaste);
        document.addEventListener('cut', handleCopyPaste);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('keyup', handleKeyDown);
            document.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('copy', handleCopyPaste);
            document.removeEventListener('paste', handleCopyPaste);
            document.removeEventListener('cut', handleCopyPaste);
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(err => console.log(err));
            }
        };
    }, []);

    const triggerWarning = (reason) => {
        if (isSubmittingRef.current) return;
        
        const now = Date.now();
        if (now - lastWarningTimeRef.current < 1000) return;
        lastWarningTimeRef.current = now;

        setWarnings(prev => {
            const newWarnings = prev + 1;
            
            if (newWarnings >= 3) {
                isSubmittingRef.current = true;
                setCustomAlert({
                    message: `⚠️ WARNING ${newWarnings}/3: ${reason}\n\nYou have reached the maximum number of warnings. Your test is being auto-submitted.`,
                    isFinal: true
                });
                handleAutoSubmit(newWarnings, "Max warnings reached");
            } else {
                setCustomAlert({
                    message: `⚠️ WARNING ${newWarnings}/3: ${reason}\n\nContinuing this behavior will result in automatic disqualification.`,
                    isFinal: false
                });
            }
            return newWarnings;
        });
    };

    const handleAutoSubmit = async (finalWarnings, reason = null) => {
        if (!isSubmittingRef.current) {
            isSubmittingRef.current = true;
        }
        setCustomAlert({
            message: `🚨 ${reason || "Max warnings reached."} Your test is being auto-submitted...`,
            isFinal: true
        });
        await submitAssessment(finalWarnings);
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const JUDGE0_API_URL = "https://ce.judge0.com/submissions?base64_encoded=false&wait=true";

    const getJudge0Language = (lang) => {
        const l = (lang || '').toLowerCase();
        if (l.includes('python') || l === 'py') return 100;
        if (l.includes('javascript') || l === 'js') return 102;
        if (l.includes('java')) return 91;
        if (l.includes('cpp') || l.includes('c++')) return 105;
        if (l === 'c') return 103;
        return 100;
    };

    /**
     * LeetCode-grade output comparison engine.
     * Accurately compares strings (with/without quotes), booleans, numbers, arrays, matrices, and trees.
     */
    const compareLeetCodeOutputs = (actualRaw, expectedRaw) => {
        if (actualRaw === undefined || actualRaw === null) actualRaw = '';
        if (expectedRaw === undefined || expectedRaw === null) expectedRaw = '';

        let act = String(actualRaw).trim().replace(/\r\n/g, '\n');
        let exp = String(expectedRaw).trim().replace(/\r\n/g, '\n');

        // 1. Direct match
        if (act === exp) return true;

        // 2. Unquote strings (fixes "string" vs string bug)
        const unquote = (s) => {
            let trimmed = s.trim();
            if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
                return trimmed.slice(1, -1);
            }
            return trimmed;
        };

        if (unquote(act) === unquote(exp)) return true;

        // 3. Boolean normalization (true / False / True)
        const isBool = (s) => s.toLowerCase() === 'true' || s.toLowerCase() === 'false';
        if (isBool(act) && isBool(exp)) {
            return act.toLowerCase() === exp.toLowerCase();
        }

        // 4. Null / None / Empty array normalization
        const isNullOrEmpty = (s) => s.toLowerCase() === 'null' || s.toLowerCase() === 'none' || s === '[]' || s === '';
        if (isNullOrEmpty(act) && isNullOrEmpty(exp)) {
            return true;
        }

        // 5. JSON Structural comparison (for arrays, matrices, trees, objects)
        try {
            const parseJson = (s) => {
                let clean = s.trim();
                if (clean.startsWith('[') || clean.startsWith('{')) {
                    return JSON.parse(clean.replace(/\bNone\b/g, 'null').replace(/\bTrue\b/g, 'true').replace(/\bFalse\b/g, 'false'));
                }
                return null;
            };

            const actJson = parseJson(act);
            const expJson = parseJson(exp);

            if (actJson !== null && expJson !== null) {
                return JSON.stringify(actJson) === JSON.stringify(expJson);
            }
        } catch (e) {
            // Fallback
        }

        // 6. Whitespace/bracket-insensitive array match: [1, 2] vs [1,2]
        const cleanArray = (s) => s.replace(/[\[\]\s"]/g, '').toLowerCase();
        if ((act.startsWith('[') && exp.startsWith('[')) || (act.includes(',') && exp.includes(','))) {
            if (cleanArray(act) === cleanArray(exp)) {
                return true;
            }
        }

        // 7. Float precision (1e-5 epsilon)
        const numAct = Number(act);
        const numExp = Number(exp);
        if (!isNaN(numAct) && !isNaN(numExp) && act !== '' && exp !== '') {
            return Math.abs(numAct - numExp) < 1e-5;
        }

        // 8. Normalized string comparison
        if (unquote(act).toLowerCase() === unquote(exp).toLowerCase()) {
            return true;
        }

        return false;
    };

    const runCode = async () => {
        setIsRunning(true);
        setOutput("Compiling and evaluating against 10 test cases...");
        setTestResults([]);
        
        try {
            const langId = getJudge0Language(language);
            const testCases = challenge?.testCases && challenge.testCases.length > 0 ? challenge.testCases : [
                { id: 1, input: challenge?.sampleInput || "", output: challenge?.sampleOutput || "", isHidden: false }
            ];

            const wrappedCode = wrapSourceCode(code, language);
            let passedCount = 0;
            let resultsList = [];
            let logSummary = "";

            for (let i = 0; i < testCases.length; i++) {
                const tc = testCases[i];
                const response = await fetch(JUDGE0_API_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        language_id: langId,
                        source_code: wrappedCode,
                        stdin: tc.input || ""
                    })
                });

                const data = await response.json();
                if (data.status?.id === 3) {
                    const actualOutput = (data.stdout || "").trim();
                    const expectedOutput = (tc.output || "").trim();
                    
                    const passed = compareLeetCodeOutputs(actualOutput, expectedOutput);
                    if (passed) passedCount++;

                    resultsList.push({
                        id: i + 1,
                        input: tc.input,
                        expected: expectedOutput,
                        actual: actualOutput,
                        passed,
                        isHidden: tc.isHidden || i >= 2,
                        description: tc.description || `Test Case ${i + 1}`
                    });

                    logSummary += `[TestCase ${i + 1}${tc.isHidden ? " (Hidden)" : ""}] ${passed ? "✅ PASSED" : "❌ FAILED"}\n`;
                    if (!tc.isHidden) {
                        logSummary += `   Input: ${tc.input}\n   Expected: ${expectedOutput}\n   Actual: ${actualOutput}\n`;
                    }
                } else {
                    const errText = data.compile_output || data.stderr || data.status?.description || "Compilation Error";
                    resultsList.push({
                        id: i + 1,
                        input: tc.input,
                        expected: tc.output,
                        actual: errText,
                        passed: false,
                        error: true,
                        isHidden: tc.isHidden || i >= 2,
                        description: tc.description || `Test Case ${i + 1}`
                    });
                    logSummary += `[TestCase ${i + 1}] ❌ ERROR: ${errText}\n`;
                }
            }

            const allPassed = passedCount === testCases.length;
            setIsOutputMatched(allPassed);
            setTestResults(resultsList);
            setOutput(`=== TEST RUN SUMMARY (${passedCount}/${testCases.length} Passed) ===\n\n${logSummary}`);
            setActiveTerminalTab('testcases');

            if (allPassed) {
                confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
            }
        } catch (error) {
            console.error("Execution error:", error);
            setOutput("Network error connecting to compiler engine.");
        }
        setIsRunning(false);
    };

    const submitAssessment = async (finalWarnings = warnings) => {
        try {
            const timeLimitInSeconds = (challenge?.timeLimit || 30) * 60;
            const timeTakenSeconds = timeLimitInSeconds - timeLeft;
            const timeTakenFormatted = formatTime(timeTakenSeconds);

            await addDoc(collection(db, 'ts_challenge_submissions'), {
                challengeId: challenge.id,
                studentUid: studentUser.uid || studentUser.id,
                studentName: studentUser.fullName,
                studentRoll: studentUser.rollNumber,
                studentDepartment: studentUser.department || '',
                studentYear: studentUser.yearOfStudy || '',
                studentSection: studentUser.section || '',
                code: code,
                output: output,
                language: language,
                warnings: finalWarnings,
                timeTaken: timeTakenSeconds,
                timeTakenFormatted: timeTakenFormatted,
                isOutputMatched: isOutputMatched,
                status: (isOutputMatched && finalWarnings < 3) ? 'verified' : 'pending',
                submittedAt: serverTimestamp()
            });
            
            alert("✅ Assessment submitted successfully!");
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(err => console.log(err));
            }
            navigate('/dashboard');
        } catch (error) {
            console.error("Submission error:", error);
            alert("Failed to submit assessment.");
        }
    };

    if (!challenge) return null;

    if (!isFullscreen) {
        return (
            <div className="h-screen w-full bg-slate-900 flex flex-col items-center justify-center text-center p-6 text-white font-sans">
                {hasStarted ? (
                    <>
                        <AlertOctagon className="w-20 h-20 text-red-500 mb-6 animate-pulse" />
                        <h1 className="text-3xl font-black uppercase tracking-widest mb-4">Fullscreen Required</h1>
                        <p className="text-slate-400 font-medium mb-8 max-w-lg">
                            You have exited fullscreen mode. The coding environment is locked to prevent malpractices. 
                            Please return to fullscreen to continue your assessment.
                        </p>
                    </>
                ) : (
                    <>
                        <Maximize className="w-20 h-20 text-blue-500 mb-6" />
                        <h1 className="text-3xl font-black uppercase tracking-widest mb-4">Ready to Begin</h1>
                        <p className="text-slate-400 font-medium mb-8 max-w-lg">
                            The secure environment requires fullscreen mode. Once you start, exiting fullscreen, 
                            copy-pasting, or switching tabs will result in a warning.
                        </p>
                    </>
                )}
                
                <button 
                    onClick={async () => {
                        try {
                            if (document.documentElement.requestFullscreen) {
                                await document.documentElement.requestFullscreen();
                            }
                        } catch (err) {
                            console.error(err);
                        }
                    }} 
                    className="px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold uppercase tracking-wider transition-all shadow-xl shadow-blue-900/50"
                >
                    {hasStarted ? "Return to Fullscreen" : "Enter Fullscreen & Start"}
                </button>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="h-screen w-full bg-[#1e1e1e] flex flex-col font-sans select-none overflow-hidden" 
             onCopy={e => e.preventDefault()} 
             onPaste={e => e.preventDefault()} 
             onCut={e => e.preventDefault()}>
            
            {/* Top Navigation Header */}
            <header className="h-14 border-b border-slate-700 bg-slate-900 flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                        <Code2 className="w-4 h-4 text-green-400" />
                    </div>
                    <h1 className="text-white font-black uppercase tracking-widest text-sm md:text-base">{challenge.title}</h1>
                    <span className={`px-3 py-1 rounded-md text-xs font-black flex items-center gap-1.5 shadow-inner ${timeLeft < 300 ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                        <Clock className="w-3.5 h-3.5" /> {formatTime(timeLeft)}
                    </span>
                    <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-md text-xs font-black uppercase flex items-center gap-1.5 shadow-inner">
                        <AlertOctagon className="w-3.5 h-3.5" /> Warnings: {warnings}/3
                    </span>
                </div>
                
                {/* Student Profile Info */}
                <div className="flex items-center gap-4 lg:gap-6 hidden md:flex text-[9px] xl:text-xs uppercase tracking-wider text-slate-400 font-bold border-l border-slate-700 pl-4 ml-auto mr-4 lg:mr-6">
                    <div className="flex items-center gap-1.5" title="Student Name">
                        <User className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-white">{studentUser.fullName}</span>
                    </div>
                    <div className="flex items-center gap-1.5" title="Register Number">
                        <Hash className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-white">{studentUser.rollNumber}</span>
                    </div>
                    <div className="flex items-center gap-1.5" title="Department">
                        <GraduationCap className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-white">{studentUser.department || 'N/A'}</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <select 
                        value={language} 
                        onChange={(e) => handleLanguageChange(e.target.value)}
                        className="bg-slate-800 text-white text-xs font-bold uppercase px-3 py-1.5 rounded-lg border border-slate-700 outline-none cursor-pointer hover:border-slate-600 transition-colors"
                    >
                        <option value="python">Python 3</option>
                        <option value="javascript">JavaScript (Node.js)</option>
                        <option value="cpp">C++ (GCC)</option>
                        <option value="java">Java 17</option>
                    </select>

                    <button 
                        onClick={runCode}
                        disabled={isRunning}
                        className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-lg ${isRunning ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/50'}`}
                    >
                        <Play className="w-3.5 h-3.5" /> {isRunning ? 'Running...' : 'Run Code'}
                    </button>

                    {isOutputMatched && (
                        <button onClick={() => submitAssessment()} className="px-4 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-black uppercase rounded-lg shadow-lg shadow-green-900/50 flex items-center gap-1.5 transition-all animate-bounce">
                            <Save className="w-3.5 h-3.5" /> Submit Solution
                        </button>
                    )}
                </div>
            </header>

            {/* Main Editor Split Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel: Problem Description */}
                <div className="w-1/3 border-r border-slate-700 bg-slate-900/70 p-6 overflow-y-auto custom-scrollbar">
                    <div className="flex items-center gap-2 mb-4">
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${challenge.difficulty === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                            {challenge.difficulty || 'EASY'}
                        </span>
                        <span className="text-slate-400 text-xs font-bold">🏆 {challenge.xpPoints || 200} XP</span>
                    </div>

                    <h2 className="text-lg font-black text-white uppercase tracking-tight mb-4">{challenge.title}</h2>
                    
                    <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-sans mb-6">
                        {challenge.problemStatement}
                    </div>

                    {/* Sample Test Case Reference */}
                    <div className="space-y-4 pt-4 border-t border-slate-800">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Layers className="w-4 h-4 text-blue-400" /> Example Case
                        </h3>
                        <div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Input</span>
                            <pre className="p-3 bg-slate-950 rounded-lg text-slate-200 font-mono text-xs border border-slate-800">{challenge.sampleInput || 'N/A'}</pre>
                        </div>
                        <div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Expected Output</span>
                            <pre className="p-3 bg-slate-950 rounded-lg text-green-400 font-mono text-xs border border-slate-800">{challenge.sampleOutput || 'N/A'}</pre>
                        </div>
                    </div>
                </div>

                {/* Live Webcam Proctor Feed */}
                {hasStarted && (
                    <div className="fixed bottom-4 right-4 w-32 h-24 bg-slate-900 border border-red-500/30 rounded-lg overflow-hidden shadow-2xl z-50 flex items-center justify-center group pointer-events-none">
                        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1] opacity-80 group-hover:opacity-100 transition-opacity" />
                        {!cameraActive && <span className="text-[8px] text-red-500 font-bold uppercase text-center p-2 absolute animate-pulse">Camera Loading...</span>}
                        <div className="absolute top-1 right-1 flex items-center gap-1 bg-red-500/20 px-1.5 py-0.5 rounded backdrop-blur-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                            <span className="text-[6px] font-black text-red-500 uppercase tracking-widest">LIVE</span>
                        </div>
                    </div>
                )}

                {/* Right Panel: Editor & Split Testcase Output */}
                <div className="w-2/3 flex flex-col bg-[#1e1e1e]">
                    {/* Monaco Editor Container */}
                    <div className="flex-1 relative">
                        <Editor
                            height="100%"
                            language={language}
                            theme="vs-dark"
                            value={code}
                            onChange={(value) => setCode(value || '')}
                            options={{
                                minimap: { enabled: false },
                                fontSize: 14,
                                fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
                                scrollBeyondLastLine: false,
                                smoothScrolling: true,
                                contextmenu: false
                            }}
                        />
                    </div>
                    
                    {/* LeetCode Style Testcase Results Panel */}
                    <div className="h-72 border-t border-slate-700 bg-slate-950 flex flex-col shrink-0">
                        {/* Terminal Tab Header */}
                        <div className="h-10 border-b border-slate-800 bg-slate-900 flex items-center justify-between px-4">
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => setActiveTerminalTab('testcases')}
                                    className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded-t-lg flex items-center gap-1.5 transition-all ${activeTerminalTab === 'testcases' ? 'bg-slate-950 text-blue-400 border-t-2 border-blue-500' : 'text-slate-400 hover:text-slate-200'}`}
                                >
                                    <Layers className="w-3.5 h-3.5" /> Test Cases ({testResults.length ? `${testResults.filter(r => r.passed).length}/${testResults.length}` : '10 Cases'})
                                </button>
                                <button 
                                    onClick={() => setActiveTerminalTab('console')}
                                    className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded-t-lg flex items-center gap-1.5 transition-all ${activeTerminalTab === 'console' ? 'bg-slate-950 text-blue-400 border-t-2 border-blue-500' : 'text-slate-400 hover:text-slate-200'}`}
                                >
                                    <Terminal className="w-3.5 h-3.5" /> Console Log
                                </button>
                            </div>

                            {testResults.length > 0 && (
                                <span className={`text-xs font-black uppercase px-3 py-1 rounded-md flex items-center gap-1 ${isOutputMatched ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                                    {isOutputMatched ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                                    {isOutputMatched ? 'All 10 Test Cases Passed!' : `${testResults.filter(r => r.passed).length} / ${testResults.length} Passed`}
                                </span>
                            )}
                        </div>

                        {/* Terminal Body */}
                        <div className="flex-1 p-4 overflow-y-auto custom-scrollbar font-mono text-xs">
                            {activeTerminalTab === 'testcases' ? (
                                testResults.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {testResults.map((tc) => (
                                            <div key={tc.id} className={`p-3 rounded-xl border transition-all ${tc.passed ? 'bg-emerald-950/20 border-emerald-800/40' : 'bg-red-950/20 border-red-800/40'}`}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="font-black text-slate-300 uppercase tracking-widest text-[10px] flex items-center gap-1.5">
                                                        {tc.isHidden ? <Lock className="w-3 h-3 text-amber-400" /> : <Layers className="w-3 h-3 text-blue-400" />}
                                                        Case #{tc.id} {tc.isHidden ? '(Hidden)' : '(Sample)'}
                                                    </span>
                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest flex items-center gap-1 ${tc.passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                                        {tc.passed ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                                        {tc.passed ? 'PASSED' : 'FAILED'}
                                                    </span>
                                                </div>

                                                {tc.isHidden ? (
                                                    <div className="text-[10px] text-slate-500 italic p-2 bg-slate-900/60 rounded border border-slate-800/50 flex items-center gap-1.5">
                                                        <Lock className="w-3 h-3 text-slate-500 shrink-0" /> Hidden test case — input and expected output locked to prevent hardcoding.
                                                    </div>
                                                ) : (
                                                    <div className="space-y-1.5 text-[10px]">
                                                        <div>
                                                            <span className="text-slate-500 font-bold uppercase">Input:</span>
                                                            <div className="text-slate-300 font-mono bg-slate-900/80 p-1.5 rounded border border-slate-800/80 truncate">{tc.input}</div>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div>
                                                                <span className="text-slate-500 font-bold uppercase">Expected:</span>
                                                                <div className="text-emerald-400 font-mono bg-slate-900/80 p-1.5 rounded border border-slate-800/80 truncate">{tc.expected}</div>
                                                            </div>
                                                            <div>
                                                                <span className="text-slate-500 font-bold uppercase">Actual:</span>
                                                                <div className={`font-mono p-1.5 rounded border border-slate-800/80 truncate ${tc.passed ? 'text-emerald-400 bg-slate-900/80' : 'text-red-400 bg-slate-900/80'}`}>{tc.actual || '(empty)'}</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center space-y-2">
                                        <Play className="w-8 h-8 opacity-40 animate-pulse text-blue-400" />
                                        <p className="text-xs font-bold uppercase tracking-wider">Click "Run Code" to compile & evaluate against all 10 test cases</p>
                                        <p className="text-[10px] text-slate-600 max-w-sm">Sample cases will display inputs/outputs. Hidden cases will evaluate strictly without revealing inputs.</p>
                                    </div>
                                )
                            ) : (
                                <div className="text-green-400 font-mono whitespace-pre-wrap leading-relaxed">
                                    {output || 'Console log output will appear here after execution...'}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Custom Fullscreen Alert Overlay */}
            {customAlert && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
                    <div className="bg-slate-950 border border-slate-700 rounded-3xl p-8 max-w-md w-full shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
                        <AlertOctagon className="w-16 h-16 text-red-500 mb-6 animate-pulse" />
                        <h3 className="text-xl font-black text-white uppercase tracking-widest mb-4">Security Alert</h3>
                        <p className="text-slate-400 font-medium whitespace-pre-wrap leading-relaxed mb-8">{customAlert.message}</p>
                        {!customAlert.isFinal ? (
                            <button 
                                onClick={() => setCustomAlert(null)}
                                className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-red-900/50"
                            >
                                I Understand
                            </button>
                        ) : (
                            <div className="w-full py-4 bg-slate-800 text-slate-400 font-black uppercase tracking-widest rounded-xl flex justify-center">
                                <span className="animate-pulse">Submitting...</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SecureCodeEditor;
