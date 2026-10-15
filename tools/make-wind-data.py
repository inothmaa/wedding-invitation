"""Builds wind-data.js: a copy of each template picture, embedded in the page's own code, that the
leaf-wind effect (wind.js) uses as its texture. Embedding it lets the effect work even when index.html is
opened straight from disk (browsers refuse to read pictures from disk for security reasons).

Run this again (python tools/make-wind-data.py, needs Pillow) whenever page_temp/2nd-bell-up.jpg or
page_temp/4th.jpeg changes.  The pictures shown on the page are NOT these copies - the originals are."""
import base64, io, os
from PIL import Image
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def b64(b): return base64.b64encode(b).decode('ascii')
# page 2: half-size copy (1080 px wide is plenty for phone screens), almost lossless
im = Image.open(os.path.join(root, 'page_temp', '2nd-bell-up.jpg')).convert('RGB')
im = im.resize((im.width // 2, im.height // 2), Image.LANCZOS)
buf = io.BytesIO(); im.save(buf, 'JPEG', quality=92, subsampling=0)
p2 = buf.getvalue()
# page 4: the original file as it is (already small)
p4 = open(os.path.join(root, 'page_temp', '4th.jpeg'), 'rb').read()
out = 'window.WIND_TEX = {\n  page2: "data:image/jpeg;base64,%s",\n  page4: "data:image/jpeg;base64,%s"\n};\n' % (b64(p2), b64(p4))
open(os.path.join(root, 'wind-data.js'), 'w', encoding='ascii').write(out)
print('page2 texture', im.size, len(p2) // 1024, 'KB;  page4 texture', len(p4) // 1024, 'KB;  wind-data.js', len(out) // 1024, 'KB')
