## how telegram bot stuff works

### Let's start with the important bit: authentication.

We wanted to find a good and secure way to authenticate users, or "link their supermemory account" to their telegram account. This was kinda challenging - because the requirements were tight and privacy was a big concern.

1. No personally identifiable information should be stored, except the user's telegram ID and supermemory email.
2. The link should be as simple as a click of a button
3. it should work two-ways: If the user signs in to the website first, or uses the telegram bot first.
4. The user should be able to unlink their account at any time.
5. Should be very, very easy to host the telegram bot.

We started out by trying to mingle with next-auth credentials provider - but that was a dead end. It would _work_, but would be too hard for us to implement and maintain, and would be a very bad user experience (get the token, copy it, paste it, etc).

So we decided to go with a simple, yet secure, way of doing it.

### the solution

Well, the solution is simple af, surprisingly. To meet all these requirements,

First off, we used the `grammy` library to create a telegram bot that works using websockets. (so, it's hosted with the website, and doesn't need a separate server)

Now, let's examine both the flows:

1. User signs in to the website first
2. Saves a bunch of stuff
3. wants to link their telegram account

and...

1. User uses the telegram bot first
2. Saves a bunch of stuff
3. wants to see their stuff in the supermemory account.

What we ended up doing is creating a simple, yet secure way - always require signin through supermemory.ai website.
And if the user comes from the telegram bot, we just redirect them to the website with a token in the URL.

The token.

The token is literally just their telegram ID, but encrypted. We use a simple encryption algorithm to encrypt the telegram ID, and then decrypt it on the website.

Why encryption? Because we don't want any random person to link any telegram account with their user id. The encryption is also interesting, done using an algorithm called [hushh](https://github.com/dhravya/hushh) that I made a while ago. It's simple and secure and all that's really needed is a secret key.

Once the user signs in, we take the decrypted token and link it to their account. And that's it. The user can now use the telegram bot to access their stuff. Because it's on the same codebase on the server side, it's very easy to make database calls and also calls to the cf-ai-backend to generate stuff.

### Natural language generation

I wanted to add this: the bot actually does both - adding content and talking to the user - at the same time.

How tho?
We use function calling in the backend repo smartly to decide what the user's intent would be. So, i can literally send the message "yo, can you remember this? (with anything else, can even be a URL!)" and the bot will understand that it's a command to add content.

orr, i can send "hey, can you tell me about the time i went to the beach?" and the bot will understand that it's a command to get content.

it's pretty cool. function calling using a cheap model works very well.
