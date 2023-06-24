# Citroën AMI Stock Tracker

<p align="center">
  <img width="300" height="204" alt="Citroën AMI orange" src="files/image/citroen-ami-orange.png?raw=true">
</p>


[Citroën AMI](https://en.wikipedia.org/wiki/Citro%C3%ABn_Ami_(electric_vehicle)) is a L6e class electric vehicle that looks like a microcar but is essentially a quadricycle. In most countries, it's sold exclusively online, but there are a few exceptions where it's also available offline. Unfortunately, Turkey is not one of these countries, and sales here are limited to online only. AMI is restocked only once a month in limited quantities, which usually run out on the same day. That leaves you with a very narrow window if you want to buy one. The Citroen Turkey website suggests following their social media accounts to track availability, but I was unable to find any related posts on their Twitter or Instagram feeds. Therefore, I came up with my own solution.

This is a simple Node.js script that tracks the availability of the Citroën AMI in Turkey through an undocumented API on the website used for online sales. The script sends an email alert to a predefined address in the `.env` file when the AMI is in stock. Please see the `.env.example` file for the full set of options.

## Installation

Script is tested with Node.js v18.12.0 (LTS), which you can download from the [official website](https://nodejs.org/en/download). Or, you may also use [NVM](https://github.com/nvm-sh/nvm).

Once you have Node.js installed, clone the repository using the following command:

```
git clone https://github.com/alikuru/ami-restocked.git
```

Then, navigate to the project directory and install the dependencies using the command below:

```
npm install
```

## Usage

Before using the script, you need to set up the environment variables in the `.env` file. Please see `.env.example` for details.

To run the script, use the following command. You might want to use a terminal multiplexer like [screen](https://en.wikipedia.org/wiki/GNU_Screen) or [tmux](https://github.com/tmux/tmux/wiki) for leaving the app running in the background. There is also [PM2](https://github.com/Unitech/pm2) but it might be an overkill for a script like this.

```
node app.js
```

Regardless of the color option you set in the `.env`, script will send an email summarizing the status of general availability. However, the message will include your favorite color's stock and reservation status.

## YMMV

Please note that this script started off with a ChatGPT prompt, which I refactored according to my needs. I am not a professional sofware developer, that's why this script guarantees nothing. Also, don't forget that Citroën Turkey might change the code on their website and render this script useless at any time. So, like with the AMI itself, your mileage may vary.

## Trademarks

"Citroën" and "AMI" are registered trademarks of Stellantis N.V. Neither me nor this script are affiliated in any manner with, or otherwise endorsed by, Stellantis N.V. Terms "Citroën" and "AMI" here merely used for describing a fan project.

## License

is script is MIT licensed. See the [LICENSE](LICENSE) file for details.