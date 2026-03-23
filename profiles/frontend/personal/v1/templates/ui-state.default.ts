const [{{uiStateName}}, {{uiStateSetterName}}] = useState({{initial}});

const {{uiStateOpenHandlerName}} = () => {
  {{uiStateSetterName}}(true);
};

const {{uiStateCloseHandlerName}} = () => {
  {{uiStateSetterName}}(false);
};
