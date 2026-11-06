import { toast } from './dom.js';

function linkDownload(filename, blob) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 4000);

  return true;
}

function saveFailed(error) {
  // turning the download down is the viewer's answer, not a failure to report
  if (error?.code === 'declined') {
    return;
  }

  toast(
    error?.code === 'rate_limited'
      ? 'Another download is waiting for your answer.'
      : `The file was not saved: ${error?.message ?? 'unknown error'}`,
  );
}

// claude.ai pages may not start downloads themselves: the `downloads` capability asks the viewer.
// Outside claude.ai (a local copy of the page) a plain link does the job.
export async function saveFile(filename, blob) {
  const claude = window.claude;

  if (!claude?.use) {
    return linkDownload(filename, blob);
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
    saveFailed(error);

    return false;
  }
}
