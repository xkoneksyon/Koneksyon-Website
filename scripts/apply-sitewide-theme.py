"""Apply the approved homepage presentation without rewriting any policy payload."""
from pathlib import Path
import re, sys
R=Path(sys.argv[1]) if len(sys.argv)>1 else Path(__file__).parent/'site'
root_policies=['terms.html','privacy.html','cookies.html','community-guidelines.html','child-safety-standards.html']
legacy_policies=['koneksyon-github-website/'+p for p in root_policies if p!='child-safety-standards.html']
home=(R/'index.html').read_text()
# Reuse the exact approved components, rooted for nested routes.
def root_urls(s):
    return re.sub(r'(href|src)="([^\"]+)"',lambda m:m[0] if m[2].startswith(('http','mailto:','/','data:')) else m[1]+'="'+('/index.html'+m[2] if m[2].startswith('#') else '/'+m[2])+'"',s)
header=root_urls(re.search(r'<header class="site-header">[\s\S]*?</header>',home)[0]).replace('<header class="site-header">','<header class="site-header" id="nav">',1)
footer=root_urls(re.search(r'<footer class="site-footer">[\s\S]*?</footer>',home)[0])
def page(original, body, kind, after=''):
    head=original[:original.index('</head>')]
    head=re.sub(r'<style\b[^>]*>[\s\S]*?</style>', '',head)
    head=re.sub(r'<link\b[^>]*(?:fonts.googleapis.com|fonts.gstatic.com)[^>]*>','',head)
    head=re.sub(r'<meta name="theme-color"[^>]*>','',head)
    head += '\n<meta name="theme-color" content="#ffffff">\n<link rel="stylesheet" href="/assets/site.css">\n<link rel="stylesheet" href="/assets/pages.css">\n<script src="/assets/site.js" defer></script>\n<script src="/assets/pages.js" defer></script>\n'
    return head+'</head>\n<body id="top" class="'+kind+'">\n<a class="skip-link" href="#main">Skip to content</a>\n'+header+'\n'+body+'\n'+footer+'\n'+after+'\n</body>\n</html>\n'
for name in root_policies:
    p=R/name; original=p.read_text()
    body=original[original.index('<div class="page-header">'):original.index('<footer>')]
    # Only the index widget changes; legal headings, metadata and article bytes stay intact.
    body=body.replace('<aside class="toc">','<details class="toc" open>').replace('</aside>','</details>')
    body=re.sub(r'<div class="toc-title">(.*?)</div>',r'<summary class="toc-title">\1</summary>',body)
    tail=original[original.index('</footer>')+9:original.index('</body>')]
    p.write_text(page(original,'<main id="main" class="policy-page">\n'+body+'\n</main>','policy-layout',tail))
for name in legacy_policies:
    p=R/name; original=p.read_text()
    if name.endswith('/privacy.html'):
        body=original[original.index('<!-- Header -->'):original.index('<div class="footer">')]
        # Existing older privacy text and section identifiers are retained verbatim.
        body='<main id="main" class="legacy-privacy policy-page">\n'+body+'\n</main>'
    else:
        heading=re.search(r'<header>[\s\S]*?</header>',original)[0].replace('<header>','<div class="document-heading">').replace('</header>','</div>')
        main=re.search(r'<main>[\s\S]*?</main>',original)[0].replace('<main>','<main id="main" class="legacy-policy">',1)
        body=heading+'\n'+main
    p.write_text(page(original,body,'policy-layout'))
# Keep the link hub's original links, language strings and language behavior.
p=R/'connect/index.html'; original=p.read_text()
body=re.search(r'<main class="page">[\s\S]*?</main>',original)[0]
body=body.replace('<main class="page">','<main id="main" class="linkhub-page">',1)
body=re.sub(r'<div class="cover"[^>]*></div>','',body)
body=re.sub(r'<footer class="footer">[\s\S]*?</footer>','',body)
tail=original[original.index('  <script>'):original.index('</body>')]
text=page(original,body,'linkhub-layout',tail)
# Relocate existing localized footer labels into the shared footer.
for dest,key in [('/privacy.html','privacy'),('/terms.html','terms'),('/community-guidelines.html','guidelines')]:
    text=text.replace('href="'+dest+'">','href="'+dest+'" data-i18n="'+key+'">')
p.write_text(text)
# Account recovery keeps its exact deeplink-building script and all token handling.
p=R/'reset-password.html'; original=p.read_text()
body=re.search(r'<main class="page">[\s\S]*?</main>',original)[0].replace('<main class="page">','<main id="main" class="account-page">',1)
tail=original[original.index('  <script>'):original.index('</body>')]
p.write_text(page(original,body,'account-layout',tail))
# Preserve the existing redirect, including query/hash handling, and style the fallback.
p=R/'links/index.html'; original=p.read_text()
body=re.search(r'<body>([\s\S]*?)</body>',original)[1]
p.write_text(page(original,'<main id="main" class="redirect-page">'+body+'</main>','redirect-layout'))
# Fit the existing download headline on the narrowest phone viewport.
p=R/'download.html'
p.write_text(p.read_text().replace('<link rel="stylesheet" href="assets/site.css">', '<link rel="stylesheet" href="assets/site.css">\n<link rel="stylesheet" href="/assets/pages.css">'))
# Old homepage/download URLs now serve the same approved presentation, not the old theme.
for name in ['index.html','download.html']:
    (R/'koneksyon-github-website'/name).write_text(root_urls((R/name).read_text()))
print('Themed 14 remaining HTML routes; approved homepage and shared assets unchanged.')
