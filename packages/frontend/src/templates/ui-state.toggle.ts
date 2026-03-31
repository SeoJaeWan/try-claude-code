const [{{uiStateName}}, {{uiStateSetterName}}] = useState({{initial}});

const {{uiStateToggleHandlerName}} = () => {
  {{uiStateSetterName}}((prev) => !prev);
};
