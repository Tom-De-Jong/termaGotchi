# termagotchi README

Welcome to my little project and thank you for reading this!

Termagotchi is a terminal style vscode extension based on a tamagotchi. You start with a screen where you choose the name of your main pet. after you start you see an overview with health and an energy bar. theres also an arrow pointing left and right. When you click those you go to the next pet because your main pet is not the only one! theres commit crab and paste pal. The names already tell you what they do. Whenever you paste the paste pal gets fed and whenever you commit. commit crab gets fed commit grab has a bar that fully drains in exactly one hour and paste crabs bar fully drains in 30 minutes.

## How to use:
Install the extension, press ctrl+shift+p, search for: termagotchi, and press enter!
## NOTE (If you reset or one of your pets die you have to press ctrl+shift+p and restart the extension)

## Features

The extension includes minor customizability (maybe more in the future), multiple pets with different needs, and the ability for the pets to die.


## Extension Settings

in package.json are a few options heres what they each do!

```
       "type": "number",
==>    "default": 1,
       "minimum": 0,
       "description": "Minutes for said pet to fully drain. Set to 0 to disable decay."
```


for each pet you can change the time in minutes that they decay so if i set the number with the arrow to 15 the pet dies in 15 minute if you don't do anything.

## Known Issues

no known issues yet!

**Enjoy!**
