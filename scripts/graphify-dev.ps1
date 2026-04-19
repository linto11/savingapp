param(
    [string]$TargetPath = ".",
    [switch]$SkipRun,
    [switch]$NoOpen
)

$repoRoot = Split-Path -Parent $PSScriptRoot
$python = Join-Path $repoRoot ".venv\Scripts\python.exe"
$graphifyExe = Join-Path $repoRoot ".venv\Scripts\graphify.exe"

if (-not (Test-Path $python)) {
    $python = "python"
}

Write-Host "Graphify repo root: $repoRoot"
Write-Host "Graph target: $TargetPath"

if (-not (Test-Path $graphifyExe)) {
    Write-Host "Installing Graphify into the project environment..."
    & $python -m pip install graphifyy
    if ($LASTEXITCODE -ne 0) {
        throw "Graphify installation failed."
    }
}

if ($SkipRun) {
    Write-Host "Graphify is available. Skipping graph generation."
    exit 0
}

Push-Location $repoRoot
try {
    $graphifyBuildScript = @"
from pathlib import Path
import json

from graphify.detect import detect
from graphify.extract import collect_files, extract
from graphify.build import build
from graphify.cluster import cluster, score_all
from graphify.analyze import god_nodes, surprising_connections, suggest_questions
from graphify.report import generate
from graphify.export import to_json, to_html

root = Path(r'''$repoRoot''')
relative_target = Path(r'''$TargetPath''')
target = (root / relative_target).resolve() if str(relative_target) != '.' else root
out = root / 'graphify-out'
out.mkdir(exist_ok=True)
cache_root = out / '.cache'
cache_root.mkdir(exist_ok=True)

detection_result = detect(target)
code_files = [
    path for path in collect_files(target, root=target)
    if 'node_modules' not in str(path)
    and '.venv' not in str(path)
    and '.git' not in str(path)
    and 'graphify-out' not in str(path)
]

extraction = extract(code_files, cache_root=cache_root)
G = build([extraction], directed=False)
communities = cluster(G)
cohesion_scores = score_all(G, communities)

def derive_community_label(cid, members):
    joined = ' '.join(
        f"{member.get('label', '')} {member.get('source_file', '')}".lower()
        for member in members
    )
    if 'graphify-dev.ps1' in joined:
        return 'Graphify Tooling'
    if 'eslint.config.js' in joined:
        return 'ESLint Config'
    if 'vite.config.js' in joined:
        return 'Vite Config'
    if '__init__.py' in joined:
        if '\\api\\routers\\' in joined:
            return 'Router Package'
        if '\\api\\' in joined:
            return 'API Package'
        if '\\core\\' in joined:
            return 'Core Package'
        if '\\domain\\' in joined:
            return 'Domain Package'
        if '\\infrastructure\\' in joined:
            return 'Infrastructure Package'
        if '\\services\\' in joined:
            return 'Services Package'
    if 'backend\\domain\\schemas.py' in joined or any(term in joined for term in ['basemodel', 'accountbase', 'expensebase', 'goalbase', 'transferbase', 'userbase']):
        return 'Schemas & DTOs'
    if 'backend\\domain\\models.py' in joined:
        return 'Domain Models'
    if 'backend\\services\\forecasting_service.py' in joined or 'forecast' in joined:
        return 'Forecasting Engine'
    if 'backend\\core\\config.py' in joined or 'backend\\api\\routers\\settings.py' in joined or any(term in joined for term in ['load_settings', 'save_settings', 'convert_currency', 'get_exchange_rate', 'get_database_status']):
        return 'Settings & Currency'
    if 'backend\\infrastructure\\database.py' in joined or 'backend\\services\\db_sync.py' in joined or any(term in joined for term in ['supabase', 'build_database_url', 'configure_database', 'set_runtime_secrets']):
        return 'Database & Supabase'
    if 'backend\\api\\routers\\records.py' in joined or any(term in joined for term in ['create_account', 'delete_account', 'update_account', 'get_accounts', 'create_expense', 'create_transfer']):
        return 'Ledger CRUD & Sync'
    if any(term in joined for term in ['bootstrap', 'create_app', 'dependencies.py', 'get_summary_payload', 'get_forecast_projection']):
        return 'App Bootstrap & API'
    return f'Community {cid + 1}'

community_labels = {
    cid: derive_community_label(
        cid,
        [dict(id=node_id, **G.nodes[node_id]) for node_id in communities[cid]],
    )
    for cid in communities
}
god_node_list = god_nodes(G)
surprise_list = surprising_connections(G, communities=communities)
suggested_questions = suggest_questions(G, communities, community_labels)

token_cost = {
    'input_tokens': extraction.get('input_tokens', 0),
    'output_tokens': extraction.get('output_tokens', 0),
}

report_text = generate(
    G,
    communities,
    cohesion_scores,
    community_labels,
    god_node_list,
    surprise_list,
    detection_result,
    token_cost,
    str(target),
    suggested_questions=suggested_questions,
)

(out / 'GRAPH_REPORT.md').write_text(report_text, encoding='utf-8')
to_json(G, communities, str(out / 'graph.json'))
to_html(G, communities, str(out / 'graph.html'), community_labels=community_labels)

summary = {
    'code_files': len(code_files),
    'nodes': G.number_of_nodes(),
    'edges': G.number_of_edges(),
    'communities': len(communities),
}
print(json.dumps(summary, indent=2))
"@

    $tmpScript = Join-Path $env:TEMP "graphify-build-repo.py"
    Set-Content -Path $tmpScript -Value $graphifyBuildScript -Encoding UTF8

    & $python $tmpScript
    if ($LASTEXITCODE -ne 0) {
        throw "Graphify execution failed."
    }

    if (-not $NoOpen) {
        $candidates = @(
            (Join-Path $repoRoot "graphify-out\graph.html"),
            (Join-Path $repoRoot "graphify-out\index.html"),
            (Join-Path $repoRoot "graphify-out\GRAPH_REPORT.md"),
            (Join-Path $repoRoot "graphify-out\README.md")
        )

        foreach ($candidate in $candidates) {
            if (Test-Path $candidate) {
                Start-Process $candidate | Out-Null
                break
            }
        }
    }
}
finally {
    Pop-Location
}
