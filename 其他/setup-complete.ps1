# Complete setup script - finds both node and npm

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Complete Node.js Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Find node
$nodePath = $null
$npmPath = $null

# Method 1: Check if node is already in PATH
try {
    $nodeCheck = & node --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        $nodeFullPath = (Get-Command node -ErrorAction SilentlyContinue).Source
        if ($nodeFullPath) {
            $nodePath = Split-Path $nodeFullPath -Parent
            Write-Host "Node.js found: $nodePath" -ForegroundColor Green
        }
    }
} catch {
    # Continue searching
}

# Method 2: Common paths
if (-not $nodePath) {
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
            $nodePath = $p
            Write-Host "Node.js found: $nodePath" -ForegroundColor Green
            break
        }
    }
}

# Find npm (usually in same directory as node)
if ($nodePath) {
    if (Test-Path "$nodePath\npm.cmd") {
        $npmPath = $nodePath
        Write-Host "npm found: $npmPath" -ForegroundColor Green
    } elseif (Test-Path "$nodePath\npm") {
        $npmPath = $nodePath
        Write-Host "npm found: $npmPath" -ForegroundColor Green
    } else {
        # Try to find npm in AppData
        $npmPaths = @(
            "$env:APPDATA\npm",
            "$env:LOCALAPPDATA\npm",
            "$env:USERPROFILE\AppData\Roaming\npm"
        )
        
        foreach ($p in $npmPaths) {
            if (Test-Path "$p\npm.cmd") {
                $npmPath = $p
                Write-Host "npm found: $npmPath" -ForegroundColor Green
                break
            }
        }
    }
}

# Add to PATH
if ($nodePath) {
    $env:PATH = "$nodePath;$env:PATH"
    Write-Host ""
    Write-Host "Added Node.js to PATH" -ForegroundColor Green
}

if ($npmPath -and $npmPath -ne $nodePath) {
    $env:PATH = "$npmPath;$env:PATH"
    Write-Host "Added npm to PATH" -ForegroundColor Green
}

# Verify
Write-Host ""
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
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  Success!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Node.js: $nodeVer" -ForegroundColor Green
    Write-Host "npm: $npmVer" -ForegroundColor Green
    Write-Host ""
    Write-Host "Now you can run:" -ForegroundColor Yellow
    Write-Host "  npm install" -ForegroundColor White
    Write-Host "  npm start" -ForegroundColor White
} elseif ($nodeVer -and -not $npmVer) {
    Write-Host ""
    Write-Host "Node.js found but npm not found" -ForegroundColor Yellow
    Write-Host "Node.js: $nodeVer" -ForegroundColor Green
    Write-Host ""
    Write-Host "You may need to install npm separately, or use npx:" -ForegroundColor Yellow
    Write-Host "  npx npm install" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "Verification failed" -ForegroundColor Red
}
