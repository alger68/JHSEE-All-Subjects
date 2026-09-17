"""Rebuild 115 original-page images and reviewed question regions.

Usage: python scripts/prepare-official-reader.py tmp/pdfs
Input: chinese/english/math/social/science/listening/writing.pdf downloaded
from the official URLs in js/config/official-papers.js. Requires PyMuPDF/Pillow.
No OCR, rewritten questions, removed watermarks, or changed answer choices.
"""
from pathlib import Path
import hashlib, io, json, re, sys
import fitz
from PIL import Image, ImageChops

root=Path(sys.argv[1] if len(sys.argv)>1 else 'tmp/pdfs')
output=Path('public/official/115'); output.mkdir(parents=True,exist_ok=True)
counts={'chinese':42,'english':43,'math':25,'social':54,'science':50,'listening':21,'writing':0}
# Reviewed irregular layouts: question -> (first figure y, split x).
# A figure may begin beside the previous question's choices. Each pair gets
# reciprocal masks so neither loses its own material or displays its neighbor.
overhangs={
    'social':{3:(330,301),5:(590,347),7:(179,344),9:(501,401),21:(350,374),24:(188,386),34:(573,410),40:(144,307)},
    'science':{5:(593,398)}
}
layouts={}
for subject,count in counts.items():
    source=root/f'{subject}.pdf'; doc=fitz.open(source)
    folder=output/subject; folder.mkdir(exist_ok=True)
    pages=[]; lines=[]; rasters=[]
    for pi,page in enumerate(doc,1):
        pix=page.get_pixmap(matrix=fitz.Matrix(2.5,2.5),alpha=False)
        im=Image.frombytes('RGB',[pix.width,pix.height],pix.samples)
        destination=folder/f'page-{pi}.webp'
        if '--layout-only' not in sys.argv:
            encoded=io.BytesIO();im.save(encoded,'WEBP',quality=92,method=6)
            destination.write_bytes(encoded.getvalue())
        assert destination.stat().st_size>1000, destination
        rasters.append(im)
        pages.append({'src':f'official/115/{subject}/page-{pi}.webp','width':round(page.rect.width,2),'height':round(page.rect.height,2)})
        for b in page.get_text('dict')['blocks']:
            for line in b.get('lines',[]):
                text=''.join(s['text'] for s in line['spans']).strip()
                x,y,x1,y1=line['bbox']
                if pi>1 and x<72:lines.append((pi,y,text))
    starts=[]; groups=[]; boundaries=[]
    for p,y,text in lines:
        # The cover instructions, internal numbered lists and manual math
        # questions must never be mistaken for objective question numbers.
        match=re.match(r'^第\s*(\d+)\s*題$',text) if subject=='listening' else re.match(r'^(\d{1,2})\s*[.．]',text)
        if match and not(subject=='math' and p>=12) and subject!='writing':
            if subject=='social' and int(match[1])==41:y=474 # table title precedes question number
            if subject=='science' and int(match[1])==23:y=373 # table title precedes question number
            if subject=='science' and int(match[1])==37:y=589 # upper arrowhead of chart
            if subject=='science' and int(match[1])==4:y=425 # upper edge of coastline diagram
            starts.append({'number':int(match[1]),'page':p,'y':y}); boundaries.append((p,y))
        if subject=='english':
            group=re.fullmatch(r'\((\d+)-(\d+)\)',text)
        elif '閱讀' in text and ('回答' in text):
            group=re.search(r'(\d+)\s*[～~至－–-]\s*(\d+)\s*題',text)
        else:group=None
        if group:
            groups.append({'start':int(group[1]),'end':int(group[2]),'page':p,'y':y});boundaries.append((p,y))
        if '部分：' in text or '二、題組' in text:boundaries.append((p,y))
    starts.sort(key=lambda q:q['number'])
    assert [q['number'] for q in starts]==list(range(1,count+1)),(subject,starts)

    def region(p,top,bottom,trim=True):
        # Trim only white margins inside the original band; figures and text
        # use the same band and stay at their original relative positions.
        page=pages[p-1]; top=max(0,top-5);bottom=min(page['height'],bottom-5)
        x0,x1=0,page['width']
        if trim:
            im=rasters[p-1]; sx=im.width/page['width'];sy=im.height/page['height']
            band=im.crop((0,int(top*sy),im.width,int(bottom*sy)))
            diff=ImageChops.difference(band,Image.new('RGB',band.size,'white')).convert('L')
            bounds=diff.point(lambda x:255 if x>22 else 0).getbbox()
            if bounds:
                a,b,c,d=bounds;x0=max(0,a/sx-5);x1=min(page['width'],c/sx+5)
                bottom=min(bottom,top+d/sy+5);top=max(top,top+b/sy-5)
        return {'page':p,'box':[round(x0,2),round(top,2),round(x1-x0,2),round(bottom-top,2)]}

    questions=[]
    for q in starts:
        p=q['page'];y=q['y']
        end=min([b for pp,b in boundaries if pp==p and b>y+1]+[763 if subject=='science' else 769])
        if subject=='math' and q['number']==1:y=77 # two-line equation extends above its number
        if subject=='social' and q['number']==34:end=772 # final option and figure reach y765
        if subject=='social' and q['number']==43:end=457 # right-hand table extends below next heading
        if subject=='science' and q['number']==5:end=772 # figure caption extends below normal page body
        if subject=='listening' and q['number']==21:end=190 # omit end-of-broadcast page footer
        masks=[]
        overhang=overhangs.get(subject,{}).get(q['number'])
        if overhang:
            top,split=overhang
            masks.append([0,top,split,round(q['y']-5-top,2)])
            y=top+5
        following=overhangs.get(subject,{}).get(q['number']+1)
        if following:
            top,split=following;masks.append([split,top,round(pages[p-1]['width']-split,2),round(end-top,2)])
        shared=[]
        group=next((g for g in groups if g['start']<=q['number']<=g['end']),None)
        if group:
            first=starts[group['start']-1]
            for gp in range(group['page'],first['page']+1):
                top=group['y'] if gp==group['page'] else 48
                bottom=first['y'] if gp==first['page'] else 769
                if bottom-top>12:shared.append(region(gp,top,bottom))
        image_region=region(p,y,end)
        if subject=='science' and q['number']==4:
            # Keep the coastline's full image rectangle, including its faint
            # upper edge which the white-margin trimmer may overlook.
            box=image_region['box'];box[3]=round(box[3]+box[1]-420,2);box[1]=420
        # These irregular layouts share a horizontal band with an unrelated
        # question. Hide only that neighboring content in question mode;
        # whole-page mode always displays the complete unmodified original.
        if subject=='social' and q['number']==43:masks.append([60,446,325,16])
        if subject=='science' and q['number']==5:masks.append([285,762,28,10])
        if masks:image_region['masks']=masks
        questions.append({'number':q['number'],'region':image_region,'shared':shared,
                          **({'group':f"{group['start']}–{group['end']}"} if group else {})})
    manual=[];formula=None
    if subject=='math':manual=[region(12,90,754),region(13,50,754)];formula=region(14,45,754)
    if subject=='writing':manual=[region(3,50,754)]
    layouts[subject]={'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'pages':pages,'questions':questions,'manual':manual,**({'formula':formula} if formula else {})}
    print(subject,len(pages),'pages;',len(questions),'questions;',len(groups),'shared passages')
Path('data/official-115-layout.json').write_text(json.dumps(layouts,ensure_ascii=False,separators=(',',':'))+'\n')
