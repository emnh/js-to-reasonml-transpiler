#!/bin/bash
i=0
for file in examples/pixiBasics/*.js; do
  i=$(($i + 1))
  is=$(printf "%03d" $i)
  echo "Writing src/Example$is.re"
  node src/puppet.js $file > src/Example${is}.re
done
