# Jambff Supabase Image Resizer

An image resize service backed by Supabase.

## Manual setup

Install the package:

```text
yarn install @jambff/supabase-image-resizer
```

Via a `.env` file, or some other mechanism depending on your environment, set
the `SUPABASE_PROJECT_URL` and `SUPABASE_SERVICE_ROLE_KEY` as environment
variables, which can be retrieved from the Supabase dashboard.

Launch the server with:

```js
import { launchServer } from '@jambff/supabase-image-resizer';

launchServer();
```

## Usage

Image requests are made in the following format:

```text
http://your.domain.com/<BUCKET>/<FOLDER>/<FILE_NAME>
```

for example:

```text
http://your.domain.com/images/public/my-image.jpg
```

The following resize properties are available:
