// Supabase Edge Function: submit-to-gallery
// Handles gallery submissions via GitHub bot token

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const REPO_OWNER = 'remyvallot';
const REPO_NAME = 'papergraph';
const BASE_BRANCH = 'main';

interface SubmissionData {
  projectId: string;
  projectData: any;
  title: string;
  description: string;
  author: string;
  affiliation: string;
  thumbnailBase64?: string;
}

serve(async (req) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    })
  }

  try {
    // Verify user is authenticated
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Get GitHub username from user metadata
    const githubUsername = user.user_metadata?.user_name || 
                          user.user_metadata?.preferred_username || 
                          'user';

    console.log(`📦 Submission from: ${githubUsername}`);

    // Parse request body
    const submission: SubmissionData = await req.json()

    // Validate required fields
    if (!submission.projectData || !submission.title || !submission.author || !submission.affiliation) {
      throw new Error('Missing required fields')
    }

    // Get bot token from environment
    const botToken = Deno.env.get('GITHUB_BOT_TOKEN')
    if (!botToken) {
      throw new Error('GitHub bot token not configured')
    }

    // Create timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const folderName = `${githubUsername}_${timestamp}`;
    const branchName = `gallery-submission-${folderName}`;

    console.log(`🌿 Creating branch: ${branchName}`);

    // GitHub API headers
    const githubHeaders = {
      'Authorization': `token ${botToken}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'PaperGraph-Bot'
    };

    // 1. Get base branch SHA
    const refResponse = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/refs/heads/${BASE_BRANCH}`,
      { headers: githubHeaders }
    );

    if (!refResponse.ok) {
      const error = await refResponse.text();
      throw new Error(`Failed to get base branch: ${error}`);
    }

    const refData = await refResponse.json();
    const baseSha = refData.object.sha;

    console.log(`✅ Base SHA: ${baseSha}`);

    // 2. Create new branch
    const createBranchResponse = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/refs`,
      {
        method: 'POST',
        headers: githubHeaders,
        body: JSON.stringify({
          ref: `refs/heads/${branchName}`,
          sha: baseSha
        })
      }
    );

    if (!createBranchResponse.ok) {
      const error = await createBranchResponse.json();
      
      // If branch already exists, delete it and recreate
      if (error.message && error.message.includes('already exists')) {
        console.log('🔄 Branch exists, deleting and recreating...');
        
        await fetch(
          `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/refs/heads/${branchName}`,
          {
            method: 'DELETE',
            headers: githubHeaders
          }
        );

        // Retry creating branch
        const retryResponse = await fetch(
          `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/refs`,
          {
            method: 'POST',
            headers: githubHeaders,
            body: JSON.stringify({
              ref: `refs/heads/${branchName}`,
              sha: baseSha
            })
          }
        );

        if (!retryResponse.ok) {
          const retryError = await retryResponse.text();
          throw new Error(`Failed to create branch after retry: ${retryError}`);
        }
      } else {
        throw new Error(`Failed to create branch: ${JSON.stringify(error)}`);
      }
    }

    console.log(`✅ Branch created: ${branchName}`);

    // 3. Get base tree
    const commitResponse = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/commits/${baseSha}`,
      { headers: githubHeaders }
    );
    const commitData = await commitResponse.json();
    const baseTreeSha = commitData.tree.sha;

    // 4. Prepare metadata
    const metadata = {
      title: submission.title,
      description: submission.description,
      author: submission.author,
      affiliation: submission.affiliation,
      submittedAt: new Date().toISOString(),
      submittedBy: githubUsername,
      path: folderName
    };

    // 5. Create blobs
    console.log('📝 Creating blobs...');
    
    const projectJson = JSON.stringify(submission.projectData, null, 2);
    const metadataJson = JSON.stringify(metadata, null, 2);

    const files = [
      {
        path: `projects/${folderName}/project.papergraph`,
        content: projectJson
      },
      {
        path: `projects/${folderName}/metadata.json`,
        content: metadataJson
      }
    ];

    if (submission.thumbnailBase64) {
      files.push({
        path: `projects/${folderName}/preview.png`,
        content: submission.thumbnailBase64,
        encoding: 'base64'
      });
    }

    const blobShas = [];
    for (const file of files) {
      const blobResponse = await fetch(
        `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/blobs`,
        {
          method: 'POST',
          headers: githubHeaders,
          body: JSON.stringify({
            content: file.content,
            encoding: file.encoding || 'utf-8'
          })
        }
      );

      const blobData = await blobResponse.json();
      blobShas.push({
        path: file.path,
        mode: '100644',
        type: 'blob',
        sha: blobData.sha
      });
    }

    console.log(`✅ Created ${blobShas.length} blobs`);

    // 6. Create tree
    const treeResponse = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/trees`,
      {
        method: 'POST',
        headers: githubHeaders,
        body: JSON.stringify({
          base_tree: baseTreeSha,
          tree: blobShas
        })
      }
    );

    const treeData = await treeResponse.json();
    console.log(`✅ Tree created: ${treeData.sha}`);

    // 7. Create commit
    const newCommitResponse = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/commits`,
      {
        method: 'POST',
        headers: githubHeaders,
        body: JSON.stringify({
          message: `Gallery submission: ${metadata.title}\n\nSubmitted by: ${metadata.author}\nAffiliation: ${metadata.affiliation}`,
          tree: treeData.sha,
          parents: [baseSha]
        })
      }
    );

    const newCommitData = await newCommitResponse.json();
    console.log(`✅ Commit created: ${newCommitData.sha}`);

    // 8. Update branch reference
    await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/refs/heads/${branchName}`,
      {
        method: 'PATCH',
        headers: githubHeaders,
        body: JSON.stringify({
          sha: newCommitData.sha,
          force: true
        })
      }
    );

    // 9. Create Pull Request
    const prBody = `## 🎨 New Gallery Submission

**Title:** ${metadata.title}  
**Author:** ${metadata.author}  
**Affiliation:** ${metadata.affiliation}  

**Description:**
${metadata.description}

---

**Submitted by:** @${githubUsername}  
**Submission date:** ${new Date().toLocaleDateString()}

### 📁 Files Added
- \`projects/${folderName}/project.papergraph\` - Project data
- \`projects/${folderName}/metadata.json\` - Project metadata
${submission.thumbnailBase64 ? `- \`projects/${folderName}/preview.png\` - Project thumbnail` : ''}

---

*This is an automated pull request created through the PaperGraph gallery submission system.*

### ✅ Review Checklist
- [ ] Project data is valid
- [ ] Metadata is complete
- [ ] Preview image is appropriate (if provided)
- [ ] No sensitive information included

Once approved and merged, this project will appear in the public gallery.`;

    const prResponse = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/pulls`,
      {
        method: 'POST',
        headers: githubHeaders,
        body: JSON.stringify({
          title: `Gallery Submission: ${metadata.title}`,
          head: branchName,
          base: BASE_BRANCH,
          body: prBody,
          maintainer_can_modify: true
        })
      }
    );

    if (!prResponse.ok) {
      const error = await prResponse.json();
      throw new Error(`Failed to create PR: ${JSON.stringify(error)}`);
    }

    const prData = await prResponse.json();
    console.log(`✅ Pull request created: ${prData.html_url}`);

    return new Response(
      JSON.stringify({
        success: true,
        prUrl: prData.html_url,
        prNumber: prData.number,
        folderName: folderName
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        status: 200
      }
    )

  } catch (error) {
    console.error('❌ Error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        status: 500
      }
    )
  }
})
