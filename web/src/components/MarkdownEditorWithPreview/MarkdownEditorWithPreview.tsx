import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Container, ButtonVariation, Layout, ButtonSize } from '@harnessio/uicore'
import type { IconName } from '@harnessio/icons'
import { Color } from '@harnessio/design-system'
import cx from 'classnames'
import type { EditorView } from '@codemirror/view'
import { EditorSelection } from '@codemirror/state'
import { Editor } from 'components/Editor/Editor'
import { MarkdownViewer } from 'components/MarkdownViewer/MarkdownViewer'
import css from './MarkdownEditorWithPreview.module.scss'

enum MarkdownEditorTab {
  WRITE = 'write',
  PREVIEW = 'preview'
}

enum ToolbarAction {
  HEADER = 'HEADER',
  BOLD = 'BOLD',
  ITALIC = 'ITALIC',
  UNORDER_LIST = 'UNORDER_LIST',
  CHECK_LIST = 'CHECK_LIST',
  CODE_BLOCK = 'CODE_BLOCK'
}

interface ToolbarItem {
  icon: IconName
  action: ToolbarAction
}

const toolbar: ToolbarItem[] = [
  { icon: 'header', action: ToolbarAction.HEADER },
  { icon: 'bold', action: ToolbarAction.BOLD },
  { icon: 'italic', action: ToolbarAction.ITALIC },
  { icon: 'properties', action: ToolbarAction.UNORDER_LIST },
  { icon: 'form', action: ToolbarAction.CHECK_LIST },
  { icon: 'main-code-yaml', action: ToolbarAction.CODE_BLOCK }
]

interface MarkdownEditorWithPreviewProps {
  value?: string
  onChange?: (value: string) => void
  onSave?: (value: string) => void
  onCancel?: () => void
  setDirty?: (dirty: boolean) => void
  i18n: {
    placeHolder: string
    tabEdit: string
    tabPreview: string
    cancel: string
    save: string
  }
  hideButtons?: boolean
  hideCancel?: boolean
  editorHeight?: string
  noBorder?: boolean
  viewRef?: React.MutableRefObject<EditorView | undefined>
  secondarySaveButton?: typeof Button

  // When set to true, the editor will be scrolled to center of screen
  // and cursor is set to the end of the document
  autoFocusAndPositioning?: boolean
}

export function MarkdownEditorWithPreview({
  value = '',
  onChange,
  onSave,
  onCancel,
  setDirty: setDirtyProp,
  i18n,
  hideButtons,
  hideCancel,
  editorHeight,
  noBorder,
  viewRef: viewRefProp,
  autoFocusAndPositioning,
  secondarySaveButton: SecondarySaveButton
}: MarkdownEditorWithPreviewProps) {
  const [selectedTab, setSelectedTab] = useState(MarkdownEditorTab.WRITE)
  const viewRef = useRef<EditorView>()
  const containerRef = useRef<HTMLDivElement>(null)
  const [dirty, setDirty] = useState(false)
  const onToolbarAction = useCallback((action: ToolbarAction) => {
    const view = viewRef.current

    if (!view?.state) {
      return
    }

    // Note: Part of this code is copied from @uiwjs/react-markdown-editor
    // MIT License, Copyright (c) 2020 uiw
    // @see https://github.dev/uiwjs/react-markdown-editor/blob/2d3f45079c79616b867ef03681a8ba9799169921/src/commands/header.tsx
    switch (action) {
      case ToolbarAction.HEADER: {
        const lineInfo = view.state.doc.lineAt(view.state.selection.main.from)
        let mark = '#'
        const matchMark = lineInfo.text.match(/^#+/)
        if (matchMark && matchMark[0]) {
          const txt = matchMark[0]
          if (txt.length < 6) {
            mark = txt + '#'
          }
        }
        if (mark.length > 6) {
          mark = '#'
        }
        const title = lineInfo.text.replace(/^#+/, '')
        view.dispatch({
          changes: {
            from: lineInfo.from,
            to: lineInfo.to,
            insert: `${mark} ${title}`
          },
          // selection: EditorSelection.range(lineInfo.from + mark.length, lineInfo.to),
          selection: { anchor: lineInfo.from + mark.length + 1 }
        })
        break
      }

      case ToolbarAction.BOLD: {
        view.dispatch(
          view.state.changeByRange(range => ({
            changes: [
              { from: range.from, insert: '**' },
              { from: range.to, insert: '**' }
            ],
            range: EditorSelection.range(range.from + 2, range.to + 2)
          }))
        )
        break
      }

      case ToolbarAction.ITALIC: {
        view.dispatch(
          view.state.changeByRange(range => ({
            changes: [
              { from: range.from, insert: '*' },
              { from: range.to, insert: '*' }
            ],
            range: EditorSelection.range(range.from + 1, range.to + 1)
          }))
        )
        break
      }

      case ToolbarAction.UNORDER_LIST: {
        const lineInfo = view.state.doc.lineAt(view.state.selection.main.from)
        let mark = '- '
        const matchMark = lineInfo.text.match(/^-/)
        if (matchMark && matchMark[0]) {
          mark = ''
        }
        view.dispatch({
          changes: {
            from: lineInfo.from,
            to: lineInfo.to,
            insert: `${mark}${lineInfo.text}`
          },
          // selection: EditorSelection.range(lineInfo.from + mark.length, lineInfo.to),
          selection: { anchor: view.state.selection.main.from + mark.length }
        })
        break
      }

      case ToolbarAction.CHECK_LIST: {
        const lineInfo = view.state.doc.lineAt(view.state.selection.main.from)
        let mark = '- [ ]  '
        const matchMark = lineInfo.text.match(/^-\s\[\s\]\s/)
        if (matchMark && matchMark[0]) {
          mark = ''
        }
        view.dispatch({
          changes: {
            from: lineInfo.from,
            to: lineInfo.to,
            insert: `${mark}${lineInfo.text}`
          },
          // selection: EditorSelection.range(lineInfo.from + mark.length, lineInfo.to),
          selection: { anchor: view.state.selection.main.from + mark.length }
        })
        break
      }

      case ToolbarAction.CODE_BLOCK: {
        const main = view.state.selection.main
        const txt = view.state.sliceDoc(view.state.selection.main.from, view.state.selection.main.to)
        view.dispatch({
          changes: {
            from: main.from,
            to: main.to,
            insert: `\`\`\`tsx\n${txt}\n\`\`\``
          },
          selection: EditorSelection.range(main.from + 3, main.from + 6)
        })
        break
      }
    }
  }, [])

  useEffect(() => {
    setDirtyProp?.(dirty)

    return () => {
      setDirtyProp?.(false)
    }
  }, [dirty]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (viewRefProp) {
      viewRefProp.current = viewRef.current
    }
  }, [viewRefProp, viewRef.current]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (autoFocusAndPositioning) {
      scrollToAndSetCursorToEnd(containerRef, viewRef, value)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Container ref={containerRef} className={cx(css.container, { [css.noBorder]: noBorder })}>
      <ul className={css.tabs}>
        <li>
          <a
            role="tab"
            tabIndex={0}
            aria-selected={selectedTab === MarkdownEditorTab.WRITE}
            onClick={() => setSelectedTab(MarkdownEditorTab.WRITE)}>
            Write
          </a>
        </li>

        <li>
          <a
            role="tab"
            tabIndex={0}
            aria-selected={selectedTab === MarkdownEditorTab.PREVIEW}
            onClick={() => setSelectedTab(MarkdownEditorTab.PREVIEW)}>
            Preview
          </a>
        </li>
      </ul>
      <Container className={css.toolbar}>
        {toolbar.map((item, index) => {
          return (
            <Button
              key={index}
              size={ButtonSize.SMALL}
              variation={ButtonVariation.ICON}
              icon={item.icon}
              withoutCurrentColor
              iconProps={{ color: Color.PRIMARY_10, size: 14 }}
              onClick={() => onToolbarAction(item.action)}
            />
          )
        })}
      </Container>
      <Container className={css.tabContent}>
        <Editor
          forMarkdown
          content={value || ''}
          placeholder={i18n.placeHolder}
          autoFocus
          viewRef={viewRef}
          setDirty={setDirty}
          maxHeight={editorHeight}
          className={selectedTab === MarkdownEditorTab.PREVIEW ? css.hidden : undefined}
          onChange={(doc, _viewUpdate, isDirty) => {
            if (isDirty) {
              onChange?.(doc.toString())
            }
          }}
        />
        {selectedTab === MarkdownEditorTab.PREVIEW && (
          <MarkdownViewer source={viewRef.current?.state.doc.toString() || ''} maxHeight={800} />
        )}
      </Container>
      {!hideButtons && (
        <Container className={css.buttonsBar}>
          <Layout.Horizontal spacing="small">
            <Button
              disabled={!dirty}
              variation={ButtonVariation.PRIMARY}
              onClick={() => onSave?.(viewRef.current?.state.doc.toString() || '')}
              text={i18n.save}
            />
            {SecondarySaveButton && (
              <SecondarySaveButton
                disabled={!dirty}
                onClick={async () => await onSave?.(viewRef.current?.state.doc.toString() || '')}
              />
            )}
            {!hideCancel && <Button variation={ButtonVariation.TERTIARY} onClick={onCancel} text={i18n.cancel} />}
          </Layout.Horizontal>
        </Container>
      )}
    </Container>
  )
}

function scrollToAndSetCursorToEnd(
  containerRef: React.RefObject<HTMLDivElement>,
  viewRef: React.MutableRefObject<EditorView | undefined>,
  content = '',
  moveCursorToEnd = true
) {
  window.setTimeout(() => {
    const dom = containerRef?.current as unknown as { scrollIntoViewIfNeeded: () => void }

    if (dom?.scrollIntoViewIfNeeded) {
      dom.scrollIntoViewIfNeeded()
    } else {
      containerRef?.current?.scrollIntoView({ block: 'center' })
    }

    if (moveCursorToEnd) {
      viewRef.current?.dispatch({ selection: { anchor: content.length, head: content.length } })
    }
  }, 250)
}
