#! /bin/bash

find dist -type f -name "*.html" -exec grep -H  -o '"og:url" content="[^"]*"' {} \; | sed -e 's/:/ /' -e 's/=/ /' -e 's/"//g' -e 's|og:url content https://vtbag.dev||' > pages

awk < pages '{print "test(\"" $2 "\", async ({ page }) => {await shoot(page, \"" $2 "\")});"; system("mkdir -p public/" $2);}' | sort

awk < pages '{print $1, $2}' | while read -r file url ; do
  cmd="s|<meta property=\"og:image\" content=\"[^\"]*\">|<meta property=\"og:image\" content=\"${url}og.png\">|"
  sed -i.bak -e "${cmd}" $file
done



