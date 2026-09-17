FEATURE=$(python3 -c "import random; print(random.choice([
    'A FOREVER IF BLOCK',
    'A GTA 6 MODE',
    'A LINUX EMULATOR',
    'A SASS MODE',
    'THE UNIVERSE',
    'AN AI',
    'AGI',
    'GNU OMNIBLOCKS',
    'CAT ASSIST',
    'A MAP OF TAIWAN',
    'AN EXTENSION MARKETPLACE WRITTEN IN RAILS AND EMBER POWERED BY ETHEREUM',
    'A GNU COREUTILS REWRITE IN ZIG',
    'AMPMOD 2',
    'SCRATCH 4.0',
    'LIBREKITTEN 2',
    'UNSANDBOXED 2',
    'MISTWARP 2',
    'UNIVERSE 2',
    'MINECRAFT 2',
    'ROBLOX BUT LESS CREEPY',
    'A SEARCH ENGINE',
    'A BEEPBOX FORK',
    'DOG ASSIST',
    'AI ASSIST',
    'AGI ASSIST'
    '[object Object]',
    'JAVASCRIPT 2',
    'PYTHON 4',
    'ORKUT 2',
    'BITCONNEEEEEEEEECT',
    'SYSTEM64',
    'WINDOWS 94',
    'ANYTHING',
    'KRITA INTEGRATION',
    'BEEPBOX INTEGRATION,
    'GIMP INTEGRATION',
    'ETHEREUM INTEGRATION',
    'BITCOIN INTEGRATION'
]))")

MONEYZ=$(python3 -c "import random; print(random.randrange(9000000, 10000000))")

TITLE="\$$MONEYZ BOUNTY FOR IMPLEMENTING $FEATURE INTO OMNIBLOCKS"

BODY=$(cat <<EOF
# \$$MONEYZ Bounty

Have you ever wanted FREE money bucks??? 🤑💰 Of COURSE you do! Who wouldn\'t?

If you want to win* \$$MONEYZ, all you have to do is implement **$FEATURE** in OmniBlocks.

Go on, make a pull request on GitHub! This is your task.

How bountiful... BOUNTIES!™ 💸🤑

<sub>
* Currency not decided yet. We may pay you in any method we deem feasible for us, including (at our option) software methods, physical methods (including physical embrace). But who cares about that? Implement and get a bounty!
</sub>

## Stats
- 💰 Value: \$$MONEYZ
- ☢️ Expiry: 24 hours from the creation of this issue
- 💸 Claim by typing \`/claim\`.
EOF
)

gh issue create \
  --repo "OmniBlocks/bountyfarmer" \
  --title "$TITLE" \
  --body "$BODY"
