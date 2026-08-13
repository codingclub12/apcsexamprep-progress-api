import zipfile, sys, re
from xml.etree import ElementTree as ET
NS='{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
f=sys.argv[1]
z=zipfile.ZipFile(f)
# shared strings
shared=[]
if 'xl/sharedStrings.xml' in z.namelist():
    r=ET.fromstring(z.read('xl/sharedStrings.xml'))
    for si in r.findall(NS+'si'):
        shared.append(''.join(t.text or '' for t in si.iter(NS+'t')))
# sheet names
wb=ET.fromstring(z.read('xl/workbook.xml'))
names=[s.get('name') for s in wb.iter(NS+'sheet')]
print('SHEETS:', names)
def colnum(ref):
    m=re.match(r'([A-Z]+)', ref); n=0
    for ch in m.group(1): n=n*26+ord(ch)-64
    return n-1
for i,name in enumerate(names, start=1):
    path='xl/worksheets/sheet%d.xml'%i
    if path not in z.namelist(): continue
    print('\n===== SHEET %d: %s =====' % (i, name))
    root=ET.fromstring(z.read(path))
    for row in root.iter(NS+'row'):
        cells={}
        for c in row.findall(NS+'c'):
            v=c.find(NS+'v'); t=c.get('t')
            if t=='inlineStr':
                val=''.join(x.text or '' for x in c.iter(NS+'t'))
            elif v is None: val=''
            elif t=='s': val=shared[int(v.text)]
            else: val=v.text
            cells[colnum(c.get('r'))]=(val or '').strip()
        if not cells: continue
        width=max(cells)+1
        print(' | '.join(cells.get(k,'') for k in range(width)))
