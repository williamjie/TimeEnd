# Fix Cursor Terminal PATH Issue
# Auto find and add Node.js to PATH

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Fix Cursor Terminal PATH" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Method 1: Try where.exe (if in system PATH)
$found = $false
$nodePath = ""

Write-Host "Searching for Node.js..." -ForegroundColor Yellow
Write-Host ""

try {
    $whereResult = where.exe node 2>$null
    if ($whereResult) {
        $fullPath = $whereResult | Select-Object -First 1
        if ($fullPath) {
            $nodePath = Split-Path $fullPath -Parent
            Write-Host "Found via where.exe: $nodePath" -ForegroundColor Green
            $found = $true
        }
    }
} catch {
    # Ignore
}

# Method 2: Check common installation paths
if (-not $found) {
    $paths = @(
        "$env:ProgramFiles\nodejs",
        "${env:ProgramFiles(x86)}\nodejs",
        "$env:LOCALAPPDATA\Programs\nodejs",
        "$env:USERPROFILE\AppData\Local\Programs\nodejs",
        "C:\Program Files\nodejs",
        "C:\Program Files (x86)\nodejs"
    )
    
    foreach ($p in $paths) {
        if (Test-Path "$p\node.exe") {
            Write-Host "Found in common path: $p" -ForegroundColor Green
            $nodePath = $p
            $found = $true
            break
        }
    }
}

# Method 3: Try registry if not found
if (-not $found) {
    Write-Host "Trying registry..." -ForegroundColor Yellow
    try {
        $regPaths = @(
            "HKLM:\SOFTWARE\Node.js",
            "HKLM:\SOFTWARE\WOW6432Node\Node.js"
        )
        
        foreach ($regPath in $regPaths) {
            if (Test-Path $regPath) {
                $reg = Get-ItemProperty $regPath -ErrorAction SilentlyContinue
                if ($reg -and $reg.InstallPath) {
                    $p = $reg.InstallPath
                    if (Test-Path "$p\node.exe") {
                        Write-Host "Found in registry: $p" -ForegroundColor Green
                        $nodePath = $p
                        $found = $true
                        break
                    }
                }
            }
        }
    } catch {
        # Ignore errors
    }
}

# Method 4: Search in Program Files (slower but thorough)
if (-not $found) {
    Write-Host "Searching Program Files..." -ForegroundColor Yellow
    $searchPaths = @(
        $env:ProgramFiles,
        ${env:ProgramFiles(x86)},
        "$env:LOCALAPPDATA\Programs"
    )
    
    foreach ($basePath in $searchPaths) {
        if (Test-Path $basePath) {
            try {
                $foundFile = Get-ChildItem -Path $basePath -Filter "node.exe" -Recurse -Depth 2 -ErrorAction SilentlyContinue | Select-Object -First 1
                if ($foundFile) {
                    $nodePath = $foundFile.DirectoryName
                    Write-Host "Found by searching: $nodePath" -ForegroundColor Green
                    $found = $true
                    break
                }
            } catch {
                # Ignore
            }
        }
    }
}

# Ask user if still not found
if (-not $found) {
    Write-Host "Node.js not found automatically" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please enter Node.js path (e.g. C:\Program Files\nodejs)" -ForegroundColor Yellow
    $inputPath = Read-Host "Path"
    
    if (Test-Path "$inputPath\node.exe") {
        $nodePath = $inputPath
        $found = $true
    } else {
        Write-Host "Invalid path" -ForegroundColor Red
        exit 1
    }
}

# Add to PATH
if ($found -and $nodePath) {
    Write-Host ""
    Write-Host "Adding to PATH..." -ForegroundColor Yellow
    $env:PATH = "$nodePath;$env:PATH"
    
    # Verify
    Write-Host "Verifying..." -ForegroundColor Yellow
    
    $nodeVer = ""
    $npmVer = ""
    
    try {
        $nodeOutput = & node --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            $nodeVer = $nodeOutput.ToString().Trim()
        }
    } catch {
        $nodeVer = ""
    }
    
    try {
        $npmOutput = & npm --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            $npmVer = $npmOutput.ToString().Trim()
        }
    } catch {
        $npmVer = ""
    }
    
    if ($nodeVer -and $npmVer) {
        Write-Host ""
        Write-Host "Success!" -ForegroundColor Green
        Write-Host "Node.js: $nodeVer" -ForegroundColor Green
        Write-Host "npm: $npmVer" -ForegroundColor Green
        Write-Host ""
        Write-Host "You can now run:" -ForegroundColor Yellow
        Write-Host "  npm install" -ForegroundColor White
        Write-Host "  npm start" -ForegroundColor White
        Write-Host ""
        Write-Host "Note: This fix is only for current terminal session." -ForegroundColor Yellow
    } else {
        Write-Host ""
        Write-Host "Verification failed. Please check Node.js installation." -ForegroundColor Red
        Write-Host "Node output: $nodeVer" -ForegroundColor Yellow
        Write-Host "npm output: $npmVer" -ForegroundColor Yellow
    }
}
