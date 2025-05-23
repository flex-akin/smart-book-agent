import chalk from "chalk";

export default class Logging {
  public static info = (args: any): void =>
    console.log(
      chalk.blue(`[${new Date().toLocaleString()}] [Info]:`),
      typeof args === "string" ? chalk.blueBright(args) : args,
    );

  public static warn = (args: any): void =>
    console.log(
      chalk.yellow(`[${new Date().toLocaleString()}] [Warn]:`),
      typeof args === "string" ? chalk.yellowBright(args) : args,
    );

  public static error = (args: any): void =>
    console.log(
      chalk.red(`[${new Date().toLocaleString()}] [Error]:`),
      typeof args === "string" ? chalk.redBright(args) : args,
    );

  public static log = (args: any): void =>
    console.log(
      chalk.green(`[${new Date().toLocaleString()}] [Log]:`),
      typeof args === "string" ? chalk.greenBright(args) : args,
    );
}
