# From the top-level folder containing your projects:
# This finds all Git repositories under the current directory.
$repoRoots = Get-ChildItem -Path . -Recurse -Directory -Filter '.git' |
    ForEach-Object { $_.Parent.FullName } |
    Sort-Object -Unique

function Test-GitIgnorePattern {
    param(
        [string]$Pattern,
        [string]$Path,
        [string]$GitIgnoreDir
    )
    
    # Normalize pattern
    $pattern = $pattern.Trim()
    
    # Skip empty lines and comments
    if ([string]::IsNullOrWhiteSpace($pattern) -or $pattern.StartsWith('#')) {
        return $false
    }
    
    # Handle negation patterns (we'll skip these for now as they're complex)
    if ($pattern.StartsWith('!')) {
        return $false
    }
    
    # Get relative path from gitignore directory
    $relativePath = $Path.Substring($GitIgnoreDir.Length).TrimStart('\', '/')
    
    # Handle trailing slash (directory-only patterns)
    $isDirectory = (Test-Path $Path -PathType Container)
    $patternIsDir = $pattern.EndsWith('/')
    $pattern = $pattern.TrimEnd('/')
    
    # If pattern specifies directory but path isn't, skip
    if ($patternIsDir -and -not $isDirectory) {
        return $false
    }
    
    # Simple pattern matching
    # Handle ** (matches any number of directories)
    if ($pattern.Contains('**')) {
        $pattern = $pattern.Replace('**', '*')
    }
    
    # Handle leading slash (anchored to gitignore directory)
    if ($pattern.StartsWith('/')) {
        $pattern = $pattern.Substring(1)
        return $relativePath -like $pattern -or $relativePath -like "$pattern/*"
    }
    
    # Handle patterns without leading slash (can match at any level)
    $pathParts = $relativePath -split '[/\\]'
    $patternParts = $pattern -split '[/\\]'
    
    # Check if pattern matches the path or any parent directory
    for ($i = 0; $i -le $pathParts.Count - $patternParts.Count; $i++) {
        $subPath = $pathParts[$i..($i + $patternParts.Count - 1)] -join '/'
        if ($subPath -like $pattern) {
            return $true
        }
    }
    
    return $false
}

foreach ($root in $repoRoots) {
    Write-Host "Processing repo: $root"
    Push-Location $root
    
    $processedPaths = @{}
    
    # First, get all ignored entries from git status (handles root .gitignore)
    git status --ignored --porcelain=v1 |
        Where-Object { $_ -like '!! *' } |
        ForEach-Object {
            if ($_ -match '^!!\s+(.+)$') {
                $relPath = $Matches[1].Trim()
                $relPathNoSlash = $relPath.TrimEnd('/')
                $target = Join-Path $root $relPathNoSlash
                
                if (Test-Path $target) {
                    Write-Host "  Marking ignored: $relPath"
                    Set-Content -Path $target -Stream 'com.dropbox.ignored' -Value 1 -ErrorAction SilentlyContinue
                    $processedPaths[$target] = $true
                }
            }
        }
    
    # Now find and process all .gitignore files in subdirectories
    Get-ChildItem -Path $root -Recurse -Filter '.gitignore' |
        Where-Object { $_.FullName -ne (Join-Path $root '.gitignore') } |
        ForEach-Object {
            $gitignoreFile = $_
            $gitignoreDir = $gitignoreFile.Directory.FullName
            
            Write-Host "  Processing nested .gitignore: $($gitignoreFile.FullName)"
            
            # Read the .gitignore file
            $patterns = @(Get-Content $gitignoreFile.FullName -ErrorAction SilentlyContinue)
            
            # Get all items in the gitignore directory and subdirectories
            Get-ChildItem -Path $gitignoreDir -Recurse -Force |
                ForEach-Object {
                    $item = $_
                    $itemPath = $item.FullName
                    
                    # Skip if already processed
                    if ($processedPaths.ContainsKey($itemPath)) {
                        return
                    }
                    
                    # Check if this item matches any pattern
                    foreach ($pattern in $patterns) {
                        if (Test-GitIgnorePattern -Pattern $pattern -Path $itemPath -GitIgnoreDir $gitignoreDir) {
                            Write-Host "    Marking ignored: $($item.FullName.Substring($root.Length).TrimStart('\', '/'))"
                            Set-Content -Path $itemPath -Stream 'com.dropbox.ignored' -Value 1 -ErrorAction SilentlyContinue
                            $processedPaths[$itemPath] = $true
                            break
                        }
                    }
                }
        }

    Pop-Location
}

Read-Host -Prompt "Processing complete. Press Enter to exit..."
