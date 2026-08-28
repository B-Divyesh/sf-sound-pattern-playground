# Demo sandbox

- URL: <https://sound-pattern-playground.sociobot.in/demo> (local: <http://127.0.0.1:4173/demo>)
- One-click entry: **Try it with sample data** on the first screen.
- Sample set: a desk tap, bottle hum, hand clap, and an unlabeled test tap. The test tap is already classified so the feature and neighbor views are useful immediately.
- Storage: IndexedDB database `demo:sound-pattern-playground`. Real use stores data in `sound-pattern-playground`; demo code never opens that database.
- Reset: **Reset demo** clears the demo stores and restores all four samples.
- Exit: **Start for real** deletes the demo database before opening the real field kit.
- Direct query fallback: `/?demo=1` enters the same isolated demo mode.

All claim tests start at `/demo` in a fresh browser context. No account, microphone setup, or external data is required; the recording tests use Playwright’s fake microphone.
