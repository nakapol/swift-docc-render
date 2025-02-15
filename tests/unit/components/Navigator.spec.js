/**
 * This source file is part of the Swift.org open source project
 *
 * Copyright (c) 2021-2022 Apple Inc. and the Swift project authors
 * Licensed under Apache License v2.0 with Runtime Library Exception
 *
 * See https://swift.org/LICENSE.txt for license information
 * See https://swift.org/CONTRIBUTORS.txt for Swift project authors
*/

import Navigator from '@/components/Navigator.vue';
import { shallowMount } from '@vue/test-utils';
import NavigatorCard from '@/components/Navigator/NavigatorCard.vue';
import SpinnerIcon from '@/components/Icons/SpinnerIcon.vue';
import { baseNavStickyAnchorId } from 'docc-render/constants/nav';
import { TopicTypes } from '@/constants/TopicTypes';
import { INDEX_ROOT_KEY } from '@/constants/sidebar';

jest.mock('docc-render/utils/throttle', () => jest.fn(v => v));

const technology = {
  title: 'FooTechnology',
  children: [
    {
      title: 'Child0',
      path: '/foo/child0',
      type: 'article',
      children: [
        {
          title: 'Child0_GrandChild0',
          path: '/foo/child0/grandchild0',
          type: 'tutorial',
        },
        {
          title: 'Child0_GrandChild1',
          path: '/foo/child0/grandchild1',
          type: 'tutorial',
          children: [{
            title: 'Child0_GrandChild0_GreatGrandChild0',
            path: '/foo/child0/grandchild0/greatgrandchild0',
            type: 'tutorial',
          }],
        },
        {
          title: 'Child0_GrandChild2',
          path: '/foo/child0/grandchild2',
          type: 'tutorial',
        },
      ],
    },
    {
      title: 'Child1',
      path: '/foo/child1/',
      type: 'tutorial',
      children: [{
        title: 'Child1_GrandChild0',
        path: '/foo/child1/grandchild0',
        type: 'method',
      }],
    },
  ],
  path: '/path/to/technology',
};

const references = {
  technologies: { kind: 'technologies' },
  root: { url: 'root' },
  first: { url: 'first' },
  second: { url: 'second' },
  third: { url: 'third' },
};

const parentTopicIdentifiers = [
  'root', 'first', 'second',
];

const fallbackTechnology = {
  title: 'FallbackTechnology',
  url: '/url/to/technology',
};

const mocks = {
  $route: {
    path: '/current/path',
  },
};

const defaultProps = {
  parentTopicIdentifiers,
  technology,
  references,
  scrollLockID: 'foo',
  breakpoint: 'large',
};

const fauxAnchor = document.createElement('DIV');
Object.defineProperty(fauxAnchor, 'offsetTop', { value: 0, writable: true });
fauxAnchor.id = baseNavStickyAnchorId;
document.body.appendChild(fauxAnchor);

const createWrapper = ({ propsData, ...others } = {}) => shallowMount(Navigator, {
  propsData: {
    ...defaultProps,
    ...propsData,
  },
  mocks,
  ...others,
});

const errorSpy = jest.spyOn(console, 'error').mockReturnValue('');

describe('Navigator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the Navigator', () => {
    const wrapper = createWrapper();
    const navigator = wrapper.find('.navigator');
    // assert navigator is a `nav`
    expect(navigator.is('nav')).toBe(true);
    expect(navigator.attributes()).toHaveProperty('aria-labelledby', INDEX_ROOT_KEY);
    // assert Navigator card is rendered
    expect(wrapper.find(NavigatorCard).props()).toEqual({
      activePath: [references.first.url, references.second.url, mocks.$route.path],
      // will assert in another test
      children: expect.any(Array),
      type: TopicTypes.module,
      technology: technology.title,
      technologyPath: technology.path,
      scrollLockID: defaultProps.scrollLockID,
      breakpoint: defaultProps.breakpoint,
      errorFetching: false,
      apiChanges: null,
    });
    expect(wrapper.find('.loading-placeholder').exists()).toBe(false);
  });

  it('renders a loading placeholder, if is fetching', () => {
    const wrapper = createWrapper({
      propsData: {
        isFetching: true,
      },
    });
    // assert Navigator card is rendered
    expect(wrapper.find(NavigatorCard).exists()).toBe(false);

    const placeholder = wrapper.find('.loading-placeholder');
    expect(placeholder.exists()).toBe(true);
    expect(placeholder.contains(SpinnerIcon)).toBe(true);
  });

  it('renders an aria live that tells VO users when navigator is loading', () => {
    const wrapper = createWrapper({
      propsData: {
        isFetching: true,
      },
    });
    expect(wrapper.find('[aria-live="polite"]').exists()).toBe(true);
    expect(wrapper.find('[aria-live="polite"]').text()).toBe('Navigator is loading');
  });

  it('renders an aria live that tells VO users when navigator is ready', () => {
    const wrapper = createWrapper();
    expect(wrapper.find('[aria-live="polite"]').exists()).toBe(true);
    expect(wrapper.find('[aria-live="polite"]').text()).toBe('Navigator is ready');
  });

  it('falls back to using the `technology.url` for the `technology-path`', () => {
    const wrapper = createWrapper({
      propsData: {
        technology: fallbackTechnology,
      },
    });
    expect(wrapper.find(NavigatorCard).props()).toEqual({
      activePath: [references.first.url, references.second.url, mocks.$route.path],
      // will assert in another test
      children: [],
      type: TopicTypes.module,
      technology: fallbackTechnology.title,
      technologyPath: fallbackTechnology.url,
      scrollLockID: defaultProps.scrollLockID,
      breakpoint: defaultProps.breakpoint,
      errorFetching: false,
      apiChanges: null,
    });
  });

  it('passes the errorFetching prop', () => {
    const wrapper = createWrapper({
      propsData: {
        errorFetching: true,
      },
    });
    expect(wrapper.find(NavigatorCard).props('errorFetching')).toBe(true);
  });

  it('strips out possible technology URLs from the activePath', () => {
    const wrapper = createWrapper({
      propsData: {
        parentTopicIdentifiers: ['technologies'].concat(parentTopicIdentifiers),
      },
    });
    expect(wrapper.find(NavigatorCard).props('activePath')).toEqual([
      references.first.url, references.second.url, mocks.$route.path,
    ]);
  });

  it('casts to lowercase and strips out trailing slashes from the last activePath item', () => {
    const wrapper = createWrapper({
      mocks: {
        ...mocks,
        $route: {
          ...mocks.$route,
          path: '/documentation/Foo/Bar/',
        },
      },
    });
    expect(wrapper.find(NavigatorCard).props('activePath')).toEqual([
      references.first.url, references.second.url, '/documentation/foo/bar',
    ]);
  });

  it('renders the root path as activePath when there is no parentTopicIdentifiers', () => {
    const wrapper = createWrapper({
      propsData: {
        parentTopicIdentifiers: [],
      },
    });
    expect(wrapper.find(NavigatorCard).props('activePath')).toEqual([mocks.$route.path]);
  });

  it('renders the root path as activePath when there are no valid parentTopicIdentifiers', () => {
    const identifier = 'ref://invalid';
    const wrapper = createWrapper({
      propsData: {
        parentTopicIdentifiers: [identifier],
      },
    });
    expect(wrapper.find(NavigatorCard).props('activePath')).toEqual([mocks.$route.path]);
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(`Reference for "${identifier}" is missing`);
  });

  it('removes any parent topic identifiers, which dont have a reference', () => {
    const wrapper = createWrapper({
      propsData: {
        references: {
          root: { url: 'root' },
          first: { url: 'first' },
          // skip the `second` reference
        },
      },
    });
    // assert `second` is missing from the activePath
    expect(wrapper.find(NavigatorCard).props('activePath')).toEqual([
      references.first.url, mocks.$route.path,
    ]);
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith('Reference for "second" is missing');
  });

  it('re-emits the `@close` event', () => {
    const wrapper = createWrapper();
    wrapper.find(NavigatorCard).vm.$emit('close');
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('generates a unique hash', () => {
    const wrapper = createWrapper();
    // make sure hashCode returns a unique hash from a string
    expect(wrapper.vm.hashCode('foo')).toBe(101574);
    expect(wrapper.vm.hashCode('oof')).toBe(110214);
    expect(wrapper.vm.hashCode('ofo')).toBe(109944);
    expect(wrapper.vm.hashCode('foo1')).toBe(3148843);
    // make sure hash is never too big
    expect(wrapper.vm.hashCode('foo1'.repeat(10))).toBe(-1535108562);
    expect(wrapper.vm.hashCode('foo1'.repeat(50))).toBe(-2107259162);
  });

  it('flattens deeply nested children and provides them to the NavigatorCard', () => {
    const wrapper = createWrapper();
    expect(wrapper.find(NavigatorCard).props('children')).toEqual([
      // root
      {
        childUIDs: [
          745124197,
          746047719,
          746971241,
        ],
        depth: 0,
        index: 0,
        type: 'article',
        siblingsCount: 2,
        parent: INDEX_ROOT_KEY,
        path: '/foo/child0',
        title: 'Child0',
        uid: 551503843,
      },
      {
        childUIDs: [],
        depth: 1,
        index: 0,
        type: 'tutorial',
        parent: 551503843,
        siblingsCount: 3,
        path: '/foo/child0/grandchild0',
        title: 'Child0_GrandChild0',
        uid: 745124197,
      },
      {
        childUIDs: [
          1489150959,
        ],
        depth: 1,
        index: 1,
        type: 'tutorial',
        parent: 551503843,
        siblingsCount: 3,
        path: '/foo/child0/grandchild1',
        title: 'Child0_GrandChild1',
        uid: 746047719,
      },
      {
        childUIDs: [],
        depth: 2,
        index: 0,
        type: 'tutorial',
        parent: 746047719,
        siblingsCount: 1,
        path: '/foo/child0/grandchild0/greatgrandchild0',
        title: 'Child0_GrandChild0_GreatGrandChild0',
        uid: 1489150959,
      },
      {
        childUIDs: [],
        depth: 1,
        index: 2,
        type: 'tutorial',
        parent: 551503843,
        siblingsCount: 3,
        path: '/foo/child0/grandchild2',
        title: 'Child0_GrandChild2',
        uid: 746971241,
      },
      {
        childUIDs: [
          -134251586,
        ],
        depth: 0,
        index: 1,
        type: 'tutorial',
        parent: INDEX_ROOT_KEY,
        siblingsCount: 2,
        path: '/foo/child1/',
        title: 'Child1',
        uid: -97593392,
      },
      {
        childUIDs: [],
        depth: 1,
        index: 0,
        type: 'method',
        parent: -97593392,
        siblingsCount: 1,
        path: '/foo/child1/grandchild0',
        title: 'Child1_GrandChild0',
        uid: -134251586,
      },
    ]);
  });
});
