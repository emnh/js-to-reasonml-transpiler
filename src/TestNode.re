type usageRequireT;

type appConsoleT;

type smallObject0T = {. "constants": usageRequireT};

[@bs.send] external require : string => smallObject0T = "require";

[@bs.val] [@bs.module "fs"]
external readFileSync2 : (string, string) => string = "readFileSync";

[@bs.val] external console : appConsoleT = "console";

let example = readFileSync2("src/example-node.txt", "utf-8");

let iRef = ref(0);

while (iRef^ < 10) {
  Js.log(iRef^);
  iRef := iRef^ + 1;
};
