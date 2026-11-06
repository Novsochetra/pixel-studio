import { toast } from './dom.js';

// claude.ai pages may not start downloads themselves: the `downloads` capability asks the viewer.
// Outside claude.ai (a local copy of the page) a plain link does the job.
export async function saveFile(filename, blob) {
  const claude = window.claude;

  if (!claude?.use) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 4000);

    return true;
  }

  const downloads = await claude.use('downloads');

  if (!downloads) {
    toast('Saving files is not available in this view. Open the page on claude.ai to download.');

    return false;
  }

  try {
    await downloads.save({ filename, data: blob });

    return true;
  } catch (error) {
    if (error?.code !== 'declined') {
      toast(
        error?.code === 'rate_limited'
          ? 'Another download is waiting for your answer.'
          : `The file was not saved: ${error?.message ?? 'unknown error'}`,
      );
    }

    return false;
  }
}
