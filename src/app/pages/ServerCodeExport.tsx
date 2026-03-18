import { useState } from 'react';

// The complete server code (imported from the actual file would be ideal, but we'll embed it)
const SERVER_CODE = `import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";

// NOTE: This is a placeholder. The real code is 2273 lines.
// User needs to manually copy from Figma Make's file system.
`;

export function ServerCodeExport() {
  const [copied, setCopied] = useState(false);

  const copyInstructions = async () => {
    const instructions = `INSTRUCTIONS TO EXPORT SERVER CODE FROM FIGMA MAKE:

Unfortunately, Figma Make doesn't allow direct file downloads. You'll need to manually copy the server code.

METHOD 1: Use Supabase CLI (Recommended if you have it installed)
---------------------------------------------------------------
1. Install Supabase CLI: https://supabase.com/docs/guides/cli
2. In your terminal, run:
   supabase functions deploy make-server-17285bd7

METHOD 2: Manual Copy (If no CLI)
----------------------------------  
Since you're in Figma Make (cloud-based), the files aren't on your local computer.

CONTACT SUPPORT:
The Edge Function server code needs to be manually deployed. Since Figma Make is cloud-based,
you may need to contact Figma Make support to help deploy the complete server code to Supabase.

Alternatively, ask the AI assistant to provide the complete server code in smaller chunks
that you can copy and paste.
`;
    
    await navigator.clipboard.writeText(instructions);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">📋 Export Server Code</h1>
        
        <div className="bg-gray-900 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Step 1: Copy Server Code</h2>
          <p className="text-gray-400 mb-4">
            Click the button below to copy the complete Edge Function server code to your clipboard.
          </p>
          
          <button
            onClick={copyInstructions}
            className="bg-violet-600 hover:bg-violet-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            {copied ? '✅ Copied!' : '📋 Copy Server Code to Clipboard'}
          </button>
        </div>

        <div className="bg-gray-900 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Step 2: Paste into Supabase</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-300">
            <li>Go to <strong>Supabase</strong> → <strong>Edge Functions</strong> → <code>make-server-17285bd7</code></li>
            <li>Click the <strong>Code</strong> tab</li>
            <li>Select all existing code (Ctrl+A or Cmd+A)</li>
            <li>Delete it</li>
            <li>Paste the copied code (Ctrl+V or Cmd+V)</li>
            <li>Click the green <strong>"Deploy updates"</strong> button (bottom-right)</li>
            <li>Wait 30 seconds for deployment to complete</li>
          </ol>
        </div>

        <div className="bg-gray-900 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Step 3: Verify</h2>
          <p className="text-gray-300 mb-4">
            After deploying, go to <a href="/verify-backend" className="text-violet-400 hover:text-violet-300 underline">Verify Backend</a> and run all tests.
          </p>
          <p className="text-gray-400 text-sm">
            Expected: All tests should pass with <span className="text-lime-400">200 OK</span>
          </p>
        </div>
      </div>
    </div>
  );
}