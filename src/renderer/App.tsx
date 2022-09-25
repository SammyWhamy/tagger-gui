import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  ChangeEvent,
  KeyboardEventHandler,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { toast, Toaster } from 'react-hot-toast';

const successToast = (message: string) => {
  toast.custom(
    (t) => (
      <div
        className={`bg-success px-5 py-3 shadow-md rounded-full text-success-content ${
          t.visible ? 'animate-enter' : 'animate-leave'
        }`}
      >
        <FontAwesomeIcon
          icon="circle-check"
          className="mr-2 scale-150 translate-x-[-0.3rem]"
        />
        {message}
      </div>
    ),
    {
      duration: 2000,
    }
  );
};

const errorToast = (message: string) => {
  toast.custom(
    (t) => (
      <div
        className={`bg-error px-5 py-3 shadow-md rounded-full text-error-content ${
          t.visible ? 'animate-enter' : 'animate-leave'
        }`}
      >
        <FontAwesomeIcon
          icon="circle-xmark"
          className="mr-2 scale-150 translate-x-[-0.3rem]"
        />
        {message}
      </div>
    ),
    {
      duration: 2000,
    }
  );
};

// const warningToast = (message: string) => {
//   toast.custom(
//     (t) => (
//       <div
//         className={`bg-warning px-5 py-3 shadow-md rounded-full text-warning-content ${
//           t.visible ? 'animate-enter' : 'animate-leave'
//         }`}
//       >
//         <FontAwesomeIcon
//           icon="circle-exclamation"
//           className="mr-2 scale-150 translate-x-[-0.3rem]"
//         />
//         {message}
//       </div>
//     ),
//     {
//       duration: 2000,
//     }
//   );
// };

const infoToast = (message: string) => {
  toast.custom(
    (t) => (
      <div
        className={`bg-info px-5 py-3 shadow-md rounded-full text-info-content ${
          t.visible ? 'animate-enter' : 'animate-leave'
        }`}
      >
        <FontAwesomeIcon
          icon="circle-info"
          className="mr-2 scale-150 translate-x-[-0.3rem]"
        />
        {message}
      </div>
    ),
    {
      duration: 2000,
    }
  );
};

const Hello = () => {
  const [statsOpen, setStatsOpen] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [tagSearch, setTagSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [searchSelection, setSearchSelection] = useState(0);
  const taggingModal = useRef<HTMLInputElement>(null);
  const renameFilesToggle = useRef<HTMLInputElement>(null);

  const [folder, setFolder] = useState('SELECT FOLDER');
  const [pathSeparator, setPathSeparator] = useState('/');
  const [image, setImage] = useState('');
  const [stats, setStats] = useState({ tagged: 0, total: 0 });
  const [renameFiles, setRenameFiles] = useState(false);

  const getData = () => {
    fetch('https://ecchi.cloud/api/info')
      .then((response) => response.json())
      .then((data) => {
        setAvailableTags(data?.tag_list || []);
        return data;
      })
      .catch(() => {});
  };

  const handlePageKeyPress = useCallback(
    (e: KeyboardEvent) => {
      const { key } = e;
      if (key === 'Escape') {
        setStatsOpen(false);
        if (taggingModal.current) {
          taggingModal.current.checked = false;
        }
      } else if (key === ' ') {
        if (tags.length > 0) {
          window.electron.ipcRenderer.sendMessage('add-file', [
            folder,
            image.split(pathSeparator).pop(),
            tags.join(';'),
            renameFiles,
          ]);
          infoToast('Adding image...');
        } else if (!image) {
          errorToast('No image loaded!');
        } else {
          errorToast('No tags selected!');
        }
      }
    },
    [folder, image, pathSeparator, tags, renameFiles]
  );

  const handleFileAddResponse = (...args: unknown[]) => {
    const reply = args[0] as
      | { success: true }
      | { success: false; error: string };

    if (reply.success) {
      successToast('Image added!');
      window.electron.ipcRenderer.sendMessage('next-file', []);
    } else {
      errorToast(reply.error);
    }
  };

  const handleNextFile = (...args: unknown[]) => {
    const reply = args[0] as
      | { success: false; message: string }
      | { success: true; file: string };

    if (reply.success) {
      setImage(reply.file);
      setTags([]);
    } else {
      errorToast(reply.message);
    }
  };

  const handleStats = (...args: unknown[]) => {
    const reply = args[0] as { tagged: number; total: number };
    setStats(reply);
  };

  const handleFolderResponse = (...args: unknown[]) => {
    const reply = args[0] as { folder: string; pathSep: string };
    setFolder(reply.folder);
    setPathSeparator(reply.pathSep);
    window.electron.ipcRenderer.sendMessage('next-file', [reply.folder]);
  };

  useEffect(() => {
    document.addEventListener('keydown', handlePageKeyPress);
    return () => {
      document.removeEventListener('keydown', handlePageKeyPress);
    };
  }, [handlePageKeyPress]);

  useEffect(() => {
    getData();
    window.electron.ipcRenderer.on('open-folder-dialog', handleFolderResponse);
    window.electron.ipcRenderer.on('next-file', handleNextFile);
    window.electron.ipcRenderer.on('add-file', handleFileAddResponse);
    window.electron.ipcRenderer.on('stats', handleStats);
  }, []);

  const handleStatsClick = () => {
    setStatsOpen(!statsOpen);
  };

  const handleTagInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setTagSearch(value.trim());

    if (value === '') {
      setSearching(false);
      setSearchResults([]);
    } else {
      setSearching(true);
      const results = availableTags
        .filter((tag) => tag.includes(value))
        .filter((tag) => !tags.includes(tag));

      if (!tags.includes(value) && !availableTags.includes(value)) {
        setSearchResults([...results, `(new) ${value}`]);
      } else {
        setSearchResults(results);
      }
    }
  };

  const handleTagInputLostFocus = () => {
    setSearching(false);
    setSearchResults([]);
    setTagSearch('');
    setSearchSelection(0);
  };

  const handleTagInputKey: KeyboardEventHandler<HTMLInputElement> = (e) => {
    const { key } = e;
    if (key === 'Enter') {
      e.preventDefault();
      let tag = searchResults[searchSelection];
      if (tag) {
        if (tag.startsWith('(new) ')) {
          tag = tag.slice(6);
          setAvailableTags([...availableTags, tag]);
        }

        setTags([...tags, tag]);
        setSearchResults(searchResults.filter((t) => t !== tag));
        if (searchSelection >= searchResults.length - 1) {
          setSearchSelection(searchSelection - 1);
        }
      }
    } else if (key === 'ArrowUp') {
      if (searchSelection > 0) {
        setSearchSelection(searchSelection - 1);
      } else {
        setSearchSelection(searchResults.length - 1);
      }
    } else if (key === 'ArrowDown') {
      if (searchSelection < searchResults.length - 1) {
        setSearchSelection(searchSelection + 1);
      } else {
        setSearchSelection(0);
      }
    }
  };

  const handleTagRemove = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleTagSearchResultClick = (tag: string) => {
    setTags([...tags, tag]);
  };

  const handleSelectFolderClick = () => {
    window.electron.ipcRenderer.sendMessage('open-folder-dialog', []);
  };

  const handleRenameFilesClick = () => {
    setRenameFiles(!renameFiles);
  };

  return (
    <div className="w-[100vw] px-5">
      <Toaster />
      <div className="navbar bg-base-100 h-max font-bold text-white px-0">
        <div className="flex-1">
          <p className="btn btn-ghost normal-case text-xl bg-base-200/40">
            HENTAI IMAGE TAGGER
          </p>
        </div>
        <div className="flex-none">
          <ul className="menu menu-horizontal p-0">
            <li>
              {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions,jsx-a11y/click-events-have-key-events */}
              <label
                className="btn btn-secondary btn-outline mx-2"
                htmlFor="rename-files-toggle"
                onClick={handleRenameFilesClick}
              >
                <span className="label-text">RENAME FILES</span>
                <input
                  type="checkbox"
                  className="toggle toggle-secondary"
                  id="rename-files-toggle"
                  ref={renameFilesToggle}
                />
              </label>
            </li>
            <li>
              {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
              <label
                className="btn btn-accent btn-outline mx-2"
                htmlFor="tagging-modal"
              >
                <FontAwesomeIcon icon="circle-info" />
                TAGGING GUIDE
              </label>
            </li>
            <li>
              <button
                className="btn btn-primary btn-outline mx-2"
                type="button"
              >
                <FontAwesomeIcon icon="file" />
                OPEN OUTPUT FILE
              </button>
            </li>
            <li>
              <button
                className="btn btn-primary btn-outline ml-2 mr-4"
                type="button"
                onClick={handleSelectFolderClick}
              >
                <FontAwesomeIcon icon="folder" />
                {folder}
              </button>
            </li>
            <li>
              <button
                type="button"
                className="btn btn-secondary btn-outline"
                onClick={handleStatsClick}
              >
                <FontAwesomeIcon icon="chart-simple" />
                Stats
                <svg
                  className="fill-current"
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                >
                  <path d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z" />
                </svg>
              </button>
              <ul
                className={`mt-3 translate-x-[-0.15rem] z-50 ${
                  statsOpen ? 'flex' : ''
                }`}
              >
                <li>
                  <div className="stats stats-vertical shadow bg-base-300 p-[7px] float-right overflow-hidden">
                    <div className="stat px-[12px]">
                      <div className="stat-value pl-2">
                        {stats.total - stats.tagged}
                      </div>
                      <div className="stat-desc pl-[10px] font-bold">
                        Untagged files
                      </div>
                    </div>
                    <div className="stat px-[12px]">
                      <div className="stat-value pl-2">{stats.tagged}</div>
                      <div className="stat-desc pl-[10px] font-bold">
                        Tagged
                      </div>
                    </div>
                  </div>
                </li>
              </ul>
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-1">
        <div className="card w-[74%] h-[80%] bg-base-200 shadow-xl m-auto float-left ml-[10%]">
          <div className="flex justify-evenly">
            <div className="w-[20%] ml-auto mt-[1.4rem] z-50">
              <input
                type="text"
                placeholder={`Type tags here (${availableTags.length})`}
                className="input input-bordered input-info w-[100%] align-top text-start z-50"
                onChange={handleTagInputChange}
                onBlur={handleTagInputLostFocus}
                value={tagSearch}
                onKeyDown={handleTagInputKey}
              />
              <div
                style={{ display: `${searching ? 'flex' : 'none'}` }}
                className="flex-col z-50 h-0 overflow-visible mt-2"
              >
                {searchResults.map((tag, index) => {
                  let extra: string;
                  if (searchResults.length === 1) {
                    extra = 'rounded';
                  } else if (index === 0) {
                    extra = 'rounded-t rounded-b-none';
                  } else if (index === searchResults.length - 1) {
                    extra = 'rounded-b rounded-t-none';
                  } else {
                    extra = 'rounded-none';
                  }

                  return (
                    <button
                      className={`btn ${
                        index === searchSelection
                          ? 'btn-secondary'
                          : 'btn-primary'
                      } ${extra}`}
                      type="button"
                      onMouseDown={() => {
                        handleTagSearchResultClick(tag);
                      }}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="divider divider-horizontal py-4 mx-2 translate-y-[0.6rem]" />
            <div className="card bg-base-100 shadow-xl w-[68%] h-[7rem] mr-auto mt-5">
              <div className="card-body justify-start flex p-3 pb-[0.9rem] flex-row flex-wrap">
                {tags.map((tag) => {
                  return (
                    <kbd className="kbd w-fit m-0 h-[30%] indicator">
                      {tag}
                      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events,jsx-a11y/no-static-element-interactions */}
                      <span
                        className="indicator-item w-5 justify-center m-auto badge badge-primary text-base-300 scale-75 cursor-pointer"
                        onClick={() => {
                          handleTagRemove(tag);
                        }}
                      >
                        <FontAwesomeIcon icon="xmark" />
                      </span>
                    </kbd>
                  );
                })}
              </div>
            </div>
          </div>

          <figure className="w-[100%] py-5">
            <img
              src={image}
              alt=""
              className="object-contain h-auto max-h-[60vh] w-auto max-w-[100%] rounded-2xl"
            />
          </figure>
        </div>
      </div>

      <div className="btn-group grid grid-cols-2 absolute inset-x-0 bottom-0 p-5">
        <button className="btn btn-outline btn-success mr-[2px]" type="button">
          SUBMIT TAGS
          <div className="pl-3">
            <kbd className="kbd">space</kbd>
          </div>
        </button>
        <button
          className="btn btn-outline btn-secondary ml-[2px]"
          type="button"
        >
          SKIP THIS IMAGE
          <div className="pl-3">
            <kbd className="kbd">ctrl</kbd>+<kbd className="kbd">space</kbd>
          </div>
        </button>
      </div>

      <input
        type="checkbox"
        id="tagging-modal"
        className="modal-toggle"
        defaultChecked
        ref={taggingModal}
      />
      <div className="modal">
        <div className="modal-box w-11/12 max-w-5xl">
          <h3 className="font-bold text-lg">
            Please read the following information before tagging images.
          </h3>
          <p className="py-4">
            When you are tagging images, try to first make use of the tags that
            already exist. You are able to add new tags, but please try to avoid
            doing so unless absolutely necessary.
            <br />
            <br />A couple tags have special instructions. Please read them
            carefully. First of all, any image requires either the{' '}
            <kbd className="kbd w-fit">ecchi</kbd> tag or the{' '}
            <kbd className="kbd w-fit">hentai</kbd> tag. If you make use of the{' '}
            <kbd className="kbd w-fit">hentai</kbd> tag, you must also make use
            of either the <kbd className="kbd w-fit">uncensored</kbd> or{' '}
            <kbd className="kbd w-fit">censored</kbd> tag.
            <br />
            Please note that the <kbd className="kbd w-fit">ecchi</kbd> tag is
            meant for content that don&apos;t show genitals, but may show
            nipples, butts, or other content. Other tags such as{' '}
            <kbd className="kbd w-fit">boobs</kbd>,{' '}
            <kbd className="kbd w-fit">pussy</kbd> or{' '}
            <kbd className="kbd w-fit">cock</kbd> are meant to be used when that
            is a main feature in the image. If you&apos;re not sure whether to
            use a tag, imagine yourself searching for that tag, would you expect
            this image to come up?
            <br />
            <br />
            Try to use between 4 and 12 tags.
          </p>
          <div className="modal-action">
            {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
            <label htmlFor="tagging-modal" className="btn">
              Understood!
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Hello />} />
      </Routes>
    </Router>
  );
}
