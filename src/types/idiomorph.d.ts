declare module 'idiomorph' {
  interface IdiomorphCallbacks {
    beforeNodeAdded?: (node: Node) => boolean
    afterNodeAdded?: (node: Node) => void
    beforeNodeMorphed?: (oldNode: Node, newNode: Node) => boolean
    afterNodeMorphed?: (oldNode: Node, newNode: Node) => void
    beforeNodeRemoved?: (node: Node) => boolean
    afterNodeRemoved?: (node: Node) => void
    beforeAttributeUpdated?: (attr: string, el: Element, type: 'update' | 'remove') => boolean
  }

  interface IdiomorphConfig {
    morphStyle?: 'outerHTML' | 'innerHTML'
    ignoreActive?: boolean
    ignoreActiveValue?: boolean
    restoreFocus?: boolean
    callbacks?: IdiomorphCallbacks
  }

  const Idiomorph: {
    morph(
      oldNode: Element | Document,
      newContent: Element | Node | NodeList | Node[] | string | null,
      config?: IdiomorphConfig
    ): Node[] | undefined
    defaults: IdiomorphConfig
  }

  export { Idiomorph }
}
