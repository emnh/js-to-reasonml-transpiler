file=flowtest.js
lib=node_modules/pixi.js/dist/pixi.js
cat $lib $file > flowtest-pixi.js
baseline=$(wc -l $lib | cut -f1 -d" ")
line=$baseline
cat $file | while read lineContents; do
  line=$(($line + 1))
  char=0
  for char in `seq 0 $(echo $lineContents | wc -L)`; do
    echo node node_modules/.bin/flow type-at-pos $file $line $char
    node node_modules/.bin/flow type-at-pos flowtest-pixi.js $line $char
  done
done
